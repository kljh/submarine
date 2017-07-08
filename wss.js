// https://github.com/websockets/ws

console.log('Loading modules...')
const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');
const express = require('express');
const session = require('express-session')
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const sqlite3 = require('sqlite3'); // .verbose();
const requestify = require('requestify'); 
const child_process = require('child_process');

// > redis-server --service-install redis.windows-service.conf
var redis_client;
try {
    redis_client = require('redis').createClient(process.env.REDIS_URL);
} catch(e) {}

// authenticates incoming requests through native Windows SSPI, hence **runs on Windows only**.
var sspi_auth;
try {
    var sspi = require('node-sspi');
    sspi_auth = new sspi({ retrieveGroups: false });
} catch(e) {}

//const ffi = require('ffi');

// logging
var winston = require('winston');
winston.level = process.env.ENV==='development' ? 'debug' : 'info';
/*
require('winston-logrotate');
winston.add(winston.transports.logrotate, {
        file: path.resolve(__dirname, 'log', 'log'), // this path needs to be absolute
        timestamp: true,
        json: false,
        size: '5k',
        keep: 999,
        compress: false }); */
winston.add(winston.transports.File, { filename: 'wss.log' });
winston.log('info', 'WSS START');


const http_port = process.env['PORT'] || 8085;
const wss_port = http_port;

// Control maximum number of concurrent HTTP request 
//http.globalAgent.maxSockets = 20; // default 5

/*
var db = new sqlite3.Database('queues.sqlite');
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS lorem (info TEXT)");
  var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
  for (var i = 0; i < 10; i++) {
      stmt.run("Ipsum " + i);
  }
  stmt.finalize();

  db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
      console.log(row.id + ": " + row.info);
  });
});

db.close();
*/


console.log('HTTP server starting ...');
var app = express();
var server = http.createServer(app);
server.listen(http_port, function () { console.log('HTTP server started on port: %s', http_port); });

// Enabling all CORS request (pre-flight, etc.)
//   - https://github.com/expressjs/cors
app.use(require('cors')());
/* Basic CORS
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}); */

// static files 
const static_file_path = __dirname;
const static_file_base_url = '/static';
console.log('HTTP server exposes static files from '+static_file_path+' under '+static_file_base_url+' ...');
app.use(static_file_base_url, express.static(static_file_path)); // script folder

// dynamic request

// body parsers (results available in req.body)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// authentication
if (sspi_auth)
app.use(function (req, res, next) {
    sspi_auth.authenticate(req, res, function(err){
        res.finished || next();
    });
});

// session
app.use(session({ secret: 'a new Tescent is born' }));

// dynamic request
app.post('/login', function (req, res) {
    req.session.username = req.body.username;
    res.send(req.session.username);
});
app.get('/login', function (req, res) {
    res.send(req.session.username);
});
app.get('/logout', function (req, res) {
    req.session.destroy(function() {
        res.send("logged-out");
    })
});

app.get('/whoami', function (req, res) {
    res.send(JSON.stringify({
        auth: req.connection.user,
        host: req.connection.remoteAddress,
        port: req.connection.remotePort,
        sspi: sspi_auth !== undefined,
        }));
});

app.get('/', function (req, res) {
    if (!req.session || !req.session.username)
        res.redirect('/static/login.html');
    else
        res.redirect('/static/chat.html');
});


console.log('WebSocket server starting ...');
const wss = new WebSocket.Server({ server: server });
wss.on('connection', wss_on_connection);

function wss_on_connection(ws, req) {
    const remote_auth = req.connection.user;
    const remote_host = req.connection.remoteAddress;
    const remote_port = req.connection.remotePort;
    const location = url.parse(req.url, true);
    console.log('connection from client: %s %s', remote_host, remote_port);
    
    ws.send(JSON.stringify({ type: "greeting_msg", txt: "Greeting "+remote_auth+" from Websocket server..." })); 
    
    ws.on('message', function incoming(message) {
        console.log('msg from client: %s', message);
        winston.log('info', message);

        var msg; 
        try { msg = JSON.parse(message); } catch(e) {}
        if (msg)
        switch (msg.type) {
            case "publish":
                if (!msg.topic) {
                    return ws.send(JSON.stringify({ type: "warn_msg", txt: "missing topic." })); 
                } else {
                    if (!topic_to_subscribers[msg.topic]) {
                        return ws.send(JSON.stringify({ type: "warn_msg", topic: msg.topic, txt: "topic does not exist" })); 
                    } else {
                        var tmp = { type: "msg_rcv", topic: msg.topic, id: msg.id, txt: msg.txt, data_url: msg.data_url };
                        broadcast_on_topic(msg.topic, tmp, msg.loopback?undefined:ws);
                    }
                }
                break;
            case "subscribe":
                add_topic_subscriber(msg.topic, ws, msg);
                break;

            case "queue_push":
                if (!msg.queue_id) return ws.send(JSON.stringify({ type: msg.type, error: "missing queue_id" }));
                redis_client.rpush(msg.queue_id, JSON.stringify(msg, null, 4), function (err, res) {
                    return ws.send(JSON.stringify({ type: msg.type, error: err, queue_depth: res }));
                });
                break;
            case "queue_pop":
                if (!msg.queue_id) return ws.send(JSON.stringify({ type: msg.type, error: "missing queue_id" }));
                if (!msg.timeout_sec) {
                    redis_client.lpop(msg.queue_id, function (err, res) {
                        return ws.send(JSON.stringify({ type: msg.type, error: err, res: res }));
                    });
                } else {
                    redis_client.blpop(msg.queue_id, msg.timeout_sec, function (err, res) {
                        if (ws.readyState === WebSocket.OPEN) 
                            return ws.send(JSON.stringify({ type: msg.type, error: err, res: res }));
                        else 
                            redis_client.lpush(msg.queue_id, res);
                    });                    
                }
                break;

            case "http_request":
                if (!msg.url) return ws.send(JSON.stringify({ type: msg.type, error: "missing url" }));
                var http_method = msg.method || (msg.body ? "POST" : "GET" );
                var http_callback = function(res) {
                    var status = res.getCode();
                    var headers = res.getHeaders();
                    var reply_body = res.getBody();
                    if (ws.readyState === WebSocket.OPEN) 
                        return ws.send(JSON.stringify({ type: msg.type, status: status, res: reply_body }));
                };
               
                if (http_method=="GET")
                    requestify.get(msg.url).then(http_callback).fail(http_callback);
                else
                    requestify.post(msg.url, msg.body).then(http_callback).fail(http_callback);

                /*
                var http_secure = msg.url.indexOf("https://")===0;
                var http_prms = { 
                    url: msg.url, 
                    host: "google.com",
                    //port: 80/443,
                    path: "/",
                    method: http_method };
                var http_req = http_secure
                    ? https.request(http_prms, http_callback)
                    : http.request(http_prms, http_callback);                    
                
                http_req.on('error', function(e) {
                    return ws.send(JSON.stringify({ type: msg.type, error: e.message }));
                });

                var data = "";
                http_req.on('data', function (data_chunk) {
                    data += data_chunk;
                });
                http_req.on('end', function() {
                    if (ws.readyState === WebSocket.OPEN) 
                        return ws.send(JSON.stringify({ type: msg.type, res: data }));
                });

                http_req.end(msg.body);
                */

                break;
            case "rpc":
                var rpc_exe = "node.exe";
                var rpc_args = [ "toupper.js" ];
                var child = child_process.execFile(rpc_exe, rpc_args, function (err, stdout, stderr) {
                    if (ws.readyState === WebSocket.OPEN) 
                        return ws.send(JSON.stringify({ type: msg.type, err: err, stdout: stdout, stderr: stderr }));
                });
                child.stdin.setEncoding('utf-8');
                child.stdin.write("console.log('Hello from PhantomJS')\n");
                child.stdin.end(); 
        }
    });

    ws.on('close', function(ev) {
        console.log('connection lost: %s %s', remote_host, remote_port);
        remove_ws(ws);
    });
}

// Broadcast to all.
function broadcast(wss, msg, opt_excluded_ws) {
    wss.clients.forEach(function(client) {
        if (client !== opt_excluded_ws && client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
};

function broadcast_on_topic(topic, msg, opt_excluded_ws) {
    var subscriber_infos = topic_to_subscribers[topic]; 
    for (var i=0; i<subscriber_infos.length; i++) {
        var ws = subscriber_infos[i].ws;
        if (ws === opt_excluded_ws)
            continue; // do not self-notify 
        if (ws.readyState === WebSocket.OPEN) 
            ws.send(msg.substr ? msg : JSON.stringify(msg));
    }
};

// Map: topic name ->  Array of subscriber info (subscriper info, sockets)
var topic_to_subscribers = {};

function add_topic_subscriber(topic, ws, msg) {
    
    // gather subscriber info
    var subscriber_info = msg; 
    subscriber_info.id = subscriber_info.id;
    subscriber_info.ws = ws;

    // add subscriber to topic, create topic if needed
    if (!topic_to_subscribers[topic])
        topic_to_subscribers[topic] = [ subscriber_info ];
    else
        topic_to_subscribers[topic].push(subscriber_info);
    
    // notify other subscribers 
    var nb_subscribers = topic_to_subscribers[topic].length;
    var notif_msg = { type: "subscriber_joined", topic: topic, nb_subscribers: nb_subscribers, id: subscriber_info.id };
    broadcast_on_topic(topic, notif_msg, ws);
}

function remove_ws(ws) {
    // remove socket from all subscription lists and notify accordingly
    for (var topic in topic_to_subscribers) 
        remove_topic_subscriber(topic, ws); 
}
function remove_topic_subscriber(topic, ws) {
    var subscriber_infos = topic_to_subscribers[topic]; 
    
    // remove socket from topic (if present), and delete topic if no more subscribers
    var removed_subscriber_info;
    for (var i=0; i<subscriber_infos.length; i++) {
        if (subscriber_infos[i].ws === ws) {
            removed_subscriber_info = subscriber_infos[i];
            subscriber_infos = subscriber_infos.splice(i, 1);
        }
        if (subscriber_infos.length===0) {
            delete topic_to_subscribers[topic];
            return;
        }
    }
    
    // notify 
    if (removed_subscriber_info) {
        var nb_subscribers = topic_to_subscribers[topic].length;
        var notif_msg = { type: "subscriber_left", topic: topic, nb_subscribers: nb_subscribers, id: removed_subscriber_info.id };
        broadcast_on_topic(topic, notif_msg, ws);
    }
}

function disp_obj(n, o) {
    console.log("\n\n--- "+n+" ---");
    for (var k in o)
    if (k[0]!='_' && typeof o[k] != 'function')
        console.log(k+': '+o[k]);
    console.log("\n");
}
