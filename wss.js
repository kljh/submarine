'use strict';

// https://github.com/websockets/ws

console.log('Loading modules...')
const cfg = require('./config.json');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const express = require('express');
const session = require('express-session')
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const requestify = require('requestify');
const child_process = require('child_process');

const extras = false;

// > redis-server --service-install redis.windows-service.conf
var redis_client;
var redis_session_store;
try {
    redis_client = require('redis').createClient(process.env.REDIS_URL || cfg.redis_server_url);
    redis_client.on("error", function(err) {
        console.error("Redis error", err);
    });

    // Redis will be used as a session store
    var redis_session_store_ctor = require('connect-redis')(session);
    redis_session_store = new redis_session_store_ctor({ client: redis_client });
} catch(e) {
    console.error("Redis cache not available.", e);
}

// authenticates incoming requests through native Windows SSPI, hence **runs on Windows only**.
var sspi_auth;
try {
    var sspi = require('node-sspi');
    sspi_auth = new sspi({ retrieveGroups: false });
} catch(e) {}

// authenticates incoming requests through LDAP.
var ldap_auth;
//try {
//    ldap_auth = require('./ldap_auth');
//} catch(e) {}


const ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        if (iface.family !== 'IPv4' || iface.internal !== false)
            return;
        console.log("IPv4 Interface", ifname, iface.address);
    });
});


const http_port = process.env['PORT'] || 8086;
const https_port = process.env['HTTPS_PORT'] || 8486;
const wss_port = http_port;

// Control maximum number of concurrent HTTP request
//http.globalAgent.maxSockets = 20; // default 5


console.log('HTTP server starting ...');
var app = express();
var server = http.createServer(app);
server.listen(http_port, function () { console.log('HTTP server started on port: %s', http_port); });

process.on('SIGTERM', clean_up_and_exit);
process.on('SIGINT', clean_up_and_exit);
process.on('SIGQUIT', clean_up_and_exit);
// process.on('SIGHUP', clean_up_and_exit);   // not a termination request 
// process.on('SIGKILL', clean_up_and_exit);  // forced termination

var clean_up_handlers = [];

function clean_up_and_exit(e) {
    console.log("Termination signal received. Clean-up.. ", e);
    
    var clean_up_promises = clean_up_handlers.map( f => f() );
    var clean_up_promise = Promise
        // .all(clean_up_promises)  // wait for all or stop with first caught !!
        .allSettled(clean_up_promises)  // wait for all 
        .then(promises => { console.log(promises); return Promise.all(promises); })  // reduce to one
        .catch(err => console.log("Clean-up with error."))
        .then(_ => { console.log("Done."); process.exit(0); });
}

clean_up_handlers.push(function app_clean_up_handler() {
    return new Promise((resolve, reject) => {
        console.log('[http] Closing server...');
        server.close(function () {
            console.log('[http] Server closed');
            resolve('[http] ok');
        });
    })
});


// HTTPS self signed certificate (under Cygwin) :
// openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfsigned.key -out selfsigned.crt
if (extras) {
	var privateKey  = fs.readFileSync('selfsigned.key', 'utf8');
	var certificate = fs.readFileSync('selfsigned.crt', 'utf8');
	var credentials = { key: privateKey, cert: certificate };
	var httpsServer = https.createServer(credentials, app);
	httpsServer.listen(https_port, function () { console.log('HTTPS server started on port: %s', https_port); });
}

app.set('trust proxy', true);

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

// webdav (adds auth / permissions)
if (extras)
	app.use(require('./webdav').webdav_init({ http_port: http_port }));

// static files
console.log('HTTP server exposes static files...');
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/', express.static(__dirname));

// link to other projects
app.use('/kljh', express.static(path.join(__dirname, '..\\kljh.github.io')));
app.use('/grid', express.static(path.join(__dirname, '..\\grid')));
app.use('/idefix', express.static(path.join(__dirname, '..\\idefix')));
app.use('/mindthegap', express.static(path.join(__dirname, '..\\mindthegap')));

app.use('/ls', function (req, res) {
    var local_path = path.join(__dirname, req.query.path);
    fs.readdir(local_path, function(err, data) {
        res.send({ error: err, data: data });
    })
});

// body parsers (results available in req.body)
app.use(bodyParser.raw({ limit: '50mb', type: function(req) {
    if (req.headers['content-type']=='application/octet-stream')
        return true;
    if (!req.headers['content-type'] && req.headers['content-length'] && req.method=="PUT")
        return true; // Win7 WeDav client does not send any content-type when uploading
    return false;
}}));
app.use(bodyParser.text())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// authentication
if (sspi_auth)
app.use("/login", function (req, res, next) {
    sspi_auth.authenticate(req, res, function(err){
        res.finished || next();
    });
});

// session
const session_handler = session({ secret: 'a new Tescent is born', store: redis_session_store });
app.use(session_handler);

// require('./code-contest/code-contest-app.js')(app);
require('./dist/uploads').register(app);
require('./dist/memo').register(app, clean_up_handlers, redis_client);

if (extras)
	require('../kljh.github.io/misc/quiz/quiz-app').register(app);

// dynamic request
app.post('/login', function (req, res) {
    req.session.info = req.session.info || {}
    var session_info = req.session.info;
    session_info.session_id = req.session.id;
    session_info.user_name = req.body.username;
    session_info.ldap = {
        mod: ldap_auth ? "installed" : "not_installed" };
    session_info.sspi = {
        uid: req.connection.user,
        mod: sspi_auth ? "installed" : "not_installed" };
    session_info.client_address = {
        host: req.connection.remoteAddress,
        port: req.connection.remotePort };

    if (ldap_auth && session_info.user_name) {
        ldap_auth(req.body.username, req.body.userpwd)
        .then(res => {
            session_info.ldap.res = res;
            res.send(req.session.info);
        })
        .catch(err => {
            session_info.ldap.error = err;
            res.send(req.session.info);
        });
    } else {
        res.send(req.session.info);
    }
});
app.get('/login', function (req, res) {
    res.send(req.session.info);
});
app.get('/logout', function (req, res) {
    req.session.destroy(function() {
        res.send("logged-out");
    })
});

//require("./github-oauth.js")(app);
//require("./dropbox-oauth.js")(app);

function whoami(req) {
    if (!req.session || !req.session.info)
        return ; // can't do anything

    var me = {};
    var info = req.session.info;
    if (info.github_oauth) {
        me.name = me.name || info.github_oauth.login;
        me.email = me.email || info.github_oauth.email;
    }
    if (info.dropbox_oauth && info.dropbox_oauth.name) {
        me.name = me.name || info.dropbox_oauth.name.display_name;
        me.email = me.email || info.dropbox_oauth.email;
    }
    if (info.ldap) {
        me.name = me.name || info.ldap.sn || info.ldap.cn || info.ldap.dn;
        me.email = me.email || info.ldap.email;
    }
    if (info.sspi) {
        me.name = me.name || info.sspi.user;
    }
    return me;
}
app.get('/whoami', function (req, res) {
    res.send(whoami(req));
});


function whereami(req) {
    var me = {
        proxy_aware: {
            forwarded: req.headers["forwarded"],
            remoteAddress: req.headers["x-forwarded-for"],
            remotePort: req.headers["x-forwarded-port"],
            headers : req.headers
        },
        without_proxy: {
            remoteAddress: req.connection.remoteAddress,
            remotePort: req.connection.remotePort,
        }
    };
    return me;
}
app.get('/whereami', function (req, res) {
    res.send(whereami(req));
});

var peer_infos = {};
app.get('/public/peers', function (req, res) {
    var peer = req.query.id;
    var info = req.headers["x-forwarded-for"] + ':' + req.headers["x-forwarded-port"];
    peer_infos[peer] = info;
    res.send(JSON.stringify(peer_infos));
});

app.get('/', function (req, res) {
    if (!req.session || !req.session.info)
        res.redirect('/static/login.html');
    else
        res.redirect('/static/chat.html');
});


//const sqlite_app = require('./sqlite.js').sqlite_install(app);
//const rscript_app = require('./rscript.js').install(app); // uses async/await
const peer_app = require('./peer-app.js').install(app); // uses async/await

console.log('WebSocket server starting ...');
const wss = new WebSocket.Server({ server: server });
wss.on('connection', wss_on_connection);

function wss_on_connection(ws, req) {
    const remote_auth = req.connection.user;
    const remote_host = req.connection.remoteAddress;
    const remote_port = req.connection.remotePort;
    const location = url.parse(req.url, true);
    console.log('connection from client: %s %s', remote_host, remote_port);

    ws.send(JSON.stringify({ type: "greeting_msg", txt: "Greeting "+remote_auth+" from Websocket server...\n"
        + "Session info not yet loaded: " + JSON.stringify(whoami(req)) }));

    // force retrieving session info from cookie
    session_handler(req, {}, function() {
        ws.send(JSON.stringify({ type: "greeting_msg", txt: "Greeting "+remote_auth+" from Websocket server...\n"
            + "Session  loaded: " + JSON.stringify(whoami(req)) }));
    })

    ws.on('message', function incoming(message) {
        console.log('msg from client: %s', message);

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
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: msg.type, queue_id: msg.queue_id, error: err, queue_depth: res }));
                    } else {
                        redis_client.lpush(msg.queue_id, res); // put back on front of the queue
                    }
                });
                break;
            case "queue_pop":
                if (!msg.queue_id) return ws.send(JSON.stringify({ type: msg.type, error: "missing queue_id" }));
                if (!msg.timeout_sec && !msg.loop) {
                    redis_client.lpop(msg.queue_id, function (err, res) {
                        ws.send(JSON.stringify({ type: msg.type, queue_id: msg.queue_id, error: err, res: JSON.parse(res) }));
                    });
                } else {
                    function pop_one() {
                        redis_client.blpop(msg.queue_id, msg.timeout_sec || 5, function (err, res) {
                            if (ws.readyState === WebSocket.OPEN) {
                                if (res)
                                    ws.send(JSON.stringify({ type: msg.type, queue_id: msg.queue_id, error: err, res: JSON.parse(res[1]) }));
                                if (msg.loop)
                                    pop_one();
                            } else {
                                if (res)
                                    redis_client.lpush(msg.queue_id, res); // put back on front of the queue
                            }
                        });
                    }
                    pop_one();
                }
                break;

            case "rexec":
                // Do NOT let people simply input arbitrary exe path, use pre-registered commands instead.
                var rexec_cmd = msg.rexec_cmd;
                var rexec_exe = "node.exe";
                var rexec_args = [ "toupper.js" ];
                if (rexec_cmd && cfg && cfg.rexec) {
                    rexec_exe = cfg.rexec[rexec_cmd].exe;
                    rexec_args = cfg.rexec[rexec_cmd].args;
                }
                var child = child_process.execFile(rexec_exe, rexec_args, function (err, stdout, stderr) {
                    if (ws.readyState === WebSocket.OPEN)
                        return ws.send(JSON.stringify({ type: msg.type, err: err, stdout: stdout, stderr: stderr }));
                });
                child.stdin.setEncoding('utf-8');
                child.stdin.write(msg.stdin);
                child.stdin.end();
                break;
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
    subscriber_info.id = msg.id;
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
