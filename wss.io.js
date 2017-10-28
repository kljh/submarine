'use strict';

// https://github.com/websockets/ws

console.log('Loading modules...')
const http = require('http');
const url = require('url');
const express = require('express');
const WebSocket = require('ws');
const socketio = require('socket.io')
//const sqlite3 = require('sqlite3').verbose();
//const ffi = require('ffi');

const http_port = process.env['PORT'] || 8085;
const wss_port = 8035;

console.log('HTTP server starting ...');
var app = express();
var server = http.createServer(app);
server.listen(http_port);

// static files 
const static_file_path = __dirname;
const static_file_base_url = '/static';
console.log('HTTP server exposes static files from '+static_file_path+' under '+static_file_base_url+' ...');
app.use(static_file_base_url, express.static(static_file_path)); // script folder
// dynamic request
app.get('/', function (req, res) {
    res.send('Hello Transiberian!');
});


const io = socketio(server);
io.on('connection', (client) => {
    var conn = client.request.connection
    console.log('Client connected', client.id, conn.remoteAddress, conn.remotePort);
    client.on('disconnect', () => {
        console.log('Client disconnected', client.id);
        remove_ws(client);
    });

    // custom 'message' event
    client.on('message', function(data) {
        socketio_server_receives_message_from_client(client, data);
    });
});

// broadcast (emit method of io object)
setInterval(() => io.emit('time', new Date().toTimeString()), 5000);

function socketio_server_receives_message_from_client(ws, message) {
    console.log('msg from client: %s', message);
        
    var msg; 
    try { msg = message.substr ? JSON.parse(message) : message; } catch(e) {}
    if (msg) {
        switch (msg.type) {
            case "publish":
                if (!msg.topic) {
                    ws.send(JSON.stringify({ type: "warn_msg", txt: "missing topic." })); 
                } else {
                    if (!topic_to_subscribers[msg.topic]) {
                        ws.send(JSON.stringify({ type: "warn_msg", topic: msg.topic, txt: "topic does not exist" })); 
                    } else {
                        var tmp = { type: "msg_rcv", topic: msg.topic, id: msg.id, txt: msg.txt };
                        broadcast_on_topic(msg.topic, tmp, msg.loopback?undefined:ws);
                    }
                }
                break;
            case "subscribe":
                add_topic_subscriber(msg.topic, ws, msg);
                break;
        }
    }
}

// Broadcast to all.
function broadcast(wss, msg, opt_excluded_ws) {
    // call io.send --or-- iterate on io.sockets
};

function broadcast_on_topic(topic, msg, opt_excluded_ws) {
    var subscriber_infos = topic_to_subscribers[topic]; 
    console.log("broadcast_on_topic: #subscriber="+subscriber_infos.length);
    for (var i=0; i<subscriber_infos.length; i++) {
        var ws = subscriber_infos[i].ws;
        if (ws === opt_excluded_ws)
            continue; // do not self-notify 
        if (ws.readyState === WebSocket.OPEN)
            ws.send(msg.substr ? msg : JSON.stringify(msg));
        else if (ws.readyState===undefined) //readyState not defined for socketio
            ws.send(msg); 
        else 
            console.log("broadcast_on_topic: connection no longer opened ws.readyState=" + ws.readyState); 
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
