"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const aws3 = require("@aws-sdk/client-s3");
// Credentials from 
// 1. AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
// 2. the files at ~/.aws/credentials and ~/.aws/config
// See https://www.npmjs.com/package/@aws-sdk/credential-provider-node
const s3c = new aws3.S3Client({}); // { region: "eu-west-3" });
// Redis client
let redis_client;
// The in-memory state of the server (a mini memcache/redis/db for quick prototype without setting-up infrastructure)
let memo = {};
function register(app, clean_up_handlers, optional_redis_client) {
    redis_client = optional_redis_client;
    function async_get_method(path, fct) {
        app.get(path, function (req, res) {
            var prms = req.method == "GET" ? req.query : req.body;
            new Promise(function (resolve, reject) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        resolve(yield fct(prms));
                    }
                    catch (e) {
                        console.error(e);
                        reject(e);
                    }
                });
            })
                .then(function (data) { if (typeof data == "object")
                res.json(data);
            else
                res.send(data); })
                .catch(function (err) { res.status(500).send({ error: err }); });
        });
    }
    async_get_method('/memo/keys', prms => keys(prms.pattern));
    async_get_method('/memo/lpush', prms => lpush(prms.key || prms.name || prms.id, prms.val || prms.value || prms.element));
    async_get_method('/memo/lpop', prms => lpop(prms.key, prms.json == "true"));
    async_get_method('/memo/lrange', prms => lrange(prms.key, prms.start, prms.stop, prms.json == "true"));
    async_get_method('/memo/sadd', prms => sadd(prms.key || prms.name || prms.id, prms.val || prms.value || prms.element));
    async_get_method('/memo/spop', prms => spop(prms.key, prms.json == "true"));
    async_get_method('/memo/sismember', prms => sismember(prms.key, prms.val || prms.value || prms.element));
    async_get_method('/memo/smembers', prms => smembers(prms.key, prms.json == "true"));
    load_state_from_aws_s3()
        .catch(err => console.log("[memo] Error with load_state_from_aws_s3", "\n", err, "\n"));
    clean_up_handlers.push(function clean_up() {
        console.log("[memo] Saving state...");
        var res = upload_state_to_aws_s3();
        console.log("[memo] State saved.");
        return res;
    });
}
exports.register = register;
function load_state_from_aws_s3() {
    const run = () => __awaiter(this, void 0, void 0, function* () {
        var json = yield load_text_from_aws_s3("memo.json");
        memo = JSON.parse(json);
        console.log(`[memo] State loaded (#${json.length})`);
    });
    return run();
}
function upload_state_to_aws_s3() {
    var json = JSON.stringify(memo);
    if (json.length < 5) {
        console.log(`[memo] Skip empty state #${memo}.`);
        return Promise.resolve("[memo] Skip empty state");
    }
    console.log(`[memo] State #${json.length}.`);
    var res1 = upload_text_to_aws_s3("memo.json", json);
    var res2 = upload_text_to_aws_s3(`memo-${new Date().toISOString().substr(0, 10)}.json`, json); // keep only the date part of ISO string (for one file a day max)
    return Promise.all([res1, res2]); // allSettled not recognised by TS
}
function load_text_from_aws_s3(key) {
    const run = () => __awaiter(this, void 0, void 0, function* () {
        // const bucket_list = await s3c.send(new aws3.ListBucketsCommand({}));
        // console.log("Success", bucket_list.Buckets);
        const get_res = yield s3c.send(new aws3.GetObjectCommand({
            Bucket: "kljhapp",
            Key: key,
        }));
        // console.log("Success", get_res);
        var len = get_res.ContentLength;
        var typ = get_res.ContentType;
        // body type is Readable | ReadableStream<any> | Blob
        var body = get_res.Body;
        //let bodyReadable = body as Readable;
        let bodyStream = body;
        let bodyBlob = body;
        let bodyMsg = body; // not what we should get (same type as from NodeJs http.request's callback)
        var txt;
        if (bodyStream.getReader) {
            var reader = bodyStream.getReader();
            var res = yield reader.read();
            txt = res.value;
            return txt;
        }
        else if (bodyBlob.text) {
            txt = yield bodyBlob.text();
            return txt;
        }
        else if (bodyMsg.read) {
            bodyMsg.setEncoding("utf8");
            txt = "";
            var fut = new Promise((resolve, reject) => {
                var res2 = bodyMsg.read();
                bodyMsg.on("data", data => {
                    txt += data;
                });
                bodyMsg.on("end", _ => resolve(txt));
                bodyMsg.on("error", err => reject(err));
            });
            return fut;
        }
        else {
            throw new Error("not supported body type");
        }
    });
    return run();
}
function upload_text_to_aws_s3(key, data) {
    const run = () => __awaiter(this, void 0, void 0, function* () {
        // const bucket_list = await s3c.send(new aws3.ListBucketsCommand({}));
        // console.log("Success", bucket_list.Buckets);
        const put_res = yield s3c.send(new aws3.PutObjectCommand({
            Bucket: "kljhapp",
            Key: key,
            Body: data,
            ACL: "public-read"
        }));
        // console.log("Success", put_res);
        return "[memo] ok";
    });
    return run();
}
function keys(key_pattern = "*") {
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
function lpush(key, val) {
    // push to redis
    if (redis_client) {
        return new Promise(function (resolve, reject) {
            let txt = val;
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
function lpop(key, bJsonParse = false) {
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
        var res = memo[key].pop();
        return bJsonParse ? JSON.parse(res) : res;
    }
}
function lrange(key, start = 0, stop = -1, bJsonParse = false) {
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
            if (start < 0)
                start = n + start + 1;
            if (stop < 0)
                stop = n + stop + 1;
            else
                stop++; // 'stop' is inclusive to match redis conventions
            var res = memo[key].slice(start, stop);
            return bJsonParse ? res.map(x => JSON.parse(x)) : res;
        }
    }
}
function sadd(key, val) {
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
function spop(key, bJsonParse = false) {
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
function sismember(key, val) {
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
function smembers(key, bJsonParse = false) {
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
//# sourceMappingURL=memo.js.map