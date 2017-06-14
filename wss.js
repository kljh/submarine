// https://github.com/websockets/ws

console.log('WebSocket server loading modules...')
const http = require('http');
const url = require('url');
const express = require('express');
const WebSocket = require('ws');
//const ffi = require('ffi');

const wss_port = 8035;
console.log('WebSocket server starting ...');
const wss = new WebSocket.Server({ port: wss_port });
console.log('WebSocket server started on port: %s', wss_port);

wss.on('connection', function connection(ws, req) {
    const remote_host = req.connection.remoteAddress;
    const remote_port = req.connection.remotePort;
    const location = url.parse(req.url, true);
    console.log('connection from client: %s %s', remote_host, remote_port);
    
    //disp_obj("ws", ws);
    //disp_obj("req", req);
    //disp_obj("req.socket", req.socket);
    //disp_obj("req.connection", req.connection);
    //disp_obj("req.client", req.client);
    //console.log(JSON.stringify(location));
    
    ws.on('message', function incoming(message) {
        console.log('msg from client: %s', message);
        
        var msg; 
        try { msg = JSON.parse(message); } catch(e) {}
        if (msg)
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
                add_topic_subscriber(msg.topic, ws, req, msg);
                break;
        }
    });

    ws.on('close', function(ev) {
        console.log('connection lost: %s %s', remote_host, remote_port);
        remove_ws(ws, req);
    });
});

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

function add_topic_subscriber(topic, ws, req, msg) {
    
    // gather subscriber info
    var subscriber_info = msg; 
    subscriber_info.id = subscriber_info.id || (req.connection.remoteAddress+" "+req.connection.remotePort);
    subscriber_info.ws = ws;
    subscriber_info.req = req;
    
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

function remove_ws(ws, req) {
    // remove socket from all subscription lists and notify accordingly
    for (var topic in topic_to_subscribers) 
        remove_topic_subscriber(topic, ws, req); 
}
function remove_topic_subscriber(topic, ws, req) {
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