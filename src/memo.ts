
import aws3 = require("@aws-sdk/client-s3");
import { IncomingMessage } from "http";
import { resolve } from "path";
import { RedisClient } from "redis";

// Credentials from 
// 1. AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
// 2. the files at ~/.aws/credentials and ~/.aws/config
// See https://www.npmjs.com/package/@aws-sdk/credential-provider-node
const s3c = new aws3.S3Client({}); // { region: "eu-west-3" });

// Redis client
let redis_client : RedisClient;

// The in-memory state of the server (a mini memcache/redis/db for quick prototype without setting-up infrastructure)
let memo : object = {};

export function register(app, clean_up_handlers: Array<() => Promise<any>>, optional_redis_client: RedisClient) {
    redis_client = optional_redis_client;

    function async_get_method(path: string, fct: (any) => any) {
        app.get(path, function (req, res) {
            var prms = req.method=="GET" ? req.query : req.body;
            new Promise(async function (resolve, reject) {
                try {
                    resolve(await fct(prms));
                } catch(e) {
                    console.error(e);
                    reject(e);
                }
            })
            .then(function(data) { if (typeof data == "object") res.json(data); else res.send(data); })
            .catch(function(err) { res.status(500).send({ error: err }); })
        });
    }
    
    async_get_method('/memo/keys', prms => keys(prms.pattern));
    async_get_method('/memo/lpush', prms => lpush(prms.key || prms.name || prms.id, prms.val || prms.value || prms.element));
    async_get_method('/memo/lpop',  prms => lpop(prms.key, prms.json=="true"));
    async_get_method('/memo/lrange',  prms => lrange(prms.key, prms.start, prms.stop, prms.json=="true"));
    async_get_method('/memo/sadd', prms => sadd(prms.key || prms.name || prms.id, prms.val || prms.value || prms.element));
    async_get_method('/memo/spop',  prms => spop(prms.key, prms.json=="true"));
    async_get_method('/memo/sismember',  prms => sismember(prms.key, prms.val || prms.value || prms.element));
    async_get_method('/memo/smembers',  prms => smembers(prms.key, prms.json=="true"));

    load_state_from_aws_s3()
    .catch(err => console.log("[memo] Error with load_state_from_aws_s3", "\n", err, "\n"));

    clean_up_handlers.push(function clean_up() {
        console.log("[memo] Saving state...");
        var res = upload_state_to_aws_s3();
        console.log("[memo] State saved.");
        return res;
    })

}

function load_state_from_aws_s3() : Promise<any> {
    const run = async () => {
        var json = await load_text_from_aws_s3("memo.json");
        memo = JSON.parse(json);
        console.log(`[memo] State loaded (#${json.length})`);
    }
    return run();
}

function upload_state_to_aws_s3() : Promise<any> {
    var json = JSON.stringify(memo);
    if (json.length < 5) {
        console.log(`[memo] Skip empty state #${memo}.`);
        return Promise.resolve("[memo] Skip empty state");
    }
    
    console.log(`[memo] State #${json.length}.`);
    var res1 = upload_text_to_aws_s3("memo.json", json);
    var res2 = upload_text_to_aws_s3(`memo-${new Date().toISOString().substr(0,10)}.json`, json);  // keep only the date part of ISO string (for one file a day max)
    return Promise.all([ res1, res2 ]);       // allSettled not recognised by TS
}

function load_text_from_aws_s3(key: string) : Promise<string> {
    const run = async () : Promise<string> => {
        // const bucket_list = await s3c.send(new aws3.ListBucketsCommand({}));
        // console.log("Success", bucket_list.Buckets);
        const get_res = await s3c.send(new aws3.GetObjectCommand({
            Bucket: "kljhapp",
            Key: key,
            // Range: "bytes=0-9" 
            }));
        // console.log("Success", get_res);

        var len = get_res.ContentLength;
        var typ = get_res.ContentType;
        
        // body type is Readable | ReadableStream<any> | Blob
        var body = get_res.Body;  
        //let bodyReadable = body as Readable;
        let bodyStream = body as ReadableStream<any>;
        let bodyBlob = body as Blob;
        let bodyMsg = body as IncomingMessage; // not what we should get (same type as from NodeJs http.request's callback)

        var txt : string;
        if (bodyStream.getReader) {
            var reader = bodyStream.getReader(); 
            var res = await reader.read();
            txt = res.value;
            return txt;
        } else if (bodyBlob.text) {
            txt = await bodyBlob.text();
            return txt;
        } else if (bodyMsg.read) {
            bodyMsg.setEncoding("utf8");
            txt = "";
            var fut = new Promise<string>((resolve, reject) => {
                var res2 = bodyMsg.read();
                bodyMsg.on("data", data => {
                    txt += data
                    });
                bodyMsg.on("end", _ => 
                    resolve(txt));
                bodyMsg.on("error", err => 
                    reject(err));
            });
            return fut;
        } else {
            throw new Error("not supported body type");
        }
    };
    return run();
}

function upload_text_to_aws_s3(key: string, data: string) {
    
    const run = async () => {
        // const bucket_list = await s3c.send(new aws3.ListBucketsCommand({}));
        // console.log("Success", bucket_list.Buckets);
        const put_res = await s3c.send(new aws3.PutObjectCommand({
            Bucket: "kljhapp",
            Key: key,
            Body: data,
            ACL: "public-read" }));
        // console.log("Success", put_res);
        return "[memo] ok";
    };
    return run();
}

function keys(key_pattern: string = "*") : any {
    
    // range from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.keys(key_pattern, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(res);
            });
        });
    }

    else

    // range from node memory (no filtering !!)
    {
        return Object.keys(memo);
    }
}

function lpush(key: string, val) : any {
    
    // push to redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            let txt: string = val;
            redis_client.lpush(key, txt, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(`[redis] lpush ${key} #${res}`);
            });
        });
    }
    
    else
    
    // push to node memory
    {
        return new Promise(function (resolve, reject) {
            if (!(key in memo)) 
                memo[key] = [];
            memo[key].push(val);
            resolve(`[memo] lpush ${key} #${memo[key].length}`);
        });
    }
}

function lpop(key: string, bJsonParse: boolean = false) : any {

    // pop from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.lpop(key, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(bJsonParse ? JSON.parse(res) : res);
            });
        });
    }

    else 

    // pop from memory
    if (key in memo) {
        var res = memo[key].pop()
        return bJsonParse ? JSON.parse(res) : res;
    }
 
}

function lrange(key: string, start: number = 0, stop: number = -1, bJsonParse: boolean = false) : any {
    
    // range from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.lrange(key, start, stop, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(bJsonParse ? res.map(x => JSON.parse(x)) : res);
            });
        });
    }

    else 

    // range from memory
    {
        if (key in memo) {
            var n = memo[key].length;
            if (start < 0) start = n + start + 1;
            if (stop < 0) stop = n + stop + 1; else stop++; // 'stop' is inclusive to match redis conventions
            var res = memo[key].slice(start, stop);
            return bJsonParse ? res.map(x => JSON.parse(x)) : res;
        }
    }
}

function sadd(key: string, val: string) : any {

    // add from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.sadd(key, val, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(`[redis] sadd ${key} ${val} #${res}`);
            });
        });
    }

    else

    // add from memory
    {
        return new Promise(function (resolve, reject) {
            if (!(key in memo)) 
                memo[key] = new Set();
            memo[key].add(val);
            resolve(`[memo] sadd ${key} ${val} #${memo[key].size}`);
        });
    }
}

function spop(key: string, bJsonParse: boolean = false) : any {

    // pop from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.spop(key, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(bJsonParse ? JSON.parse(res) : res);
            });
        });
    }

    else 

    // pop from memory
    { 
        throw new Error("[memo] spop not implemented");
    }
}

function sismember(key: string, val: string) : any {
    
    // sismember from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.sismember(key, val, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(`${res}`);
            });
        });
    }

    else 

    // sismember from memory
    {
        if (key in memo) {
            var res = memo[key].has(val);
            return `${res}`;
        }
    }
}

function smembers(key: string, bJsonParse: boolean = false) : any {
    
    // smembers from redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            redis_client.smembers(key, function (err, res) {
                if (err)
                    reject(err);
                else 
                    resolve(bJsonParse ? res.map(x => JSON.parse(x)) : res);
            });
        });
    }

    else 

    // smembers from memory
    {
        if (key in memo) {
            var res = memo[key].keys();
            return bJsonParse ? res.map(x => JSON.parse(x)) : res;
        }
    }
}
