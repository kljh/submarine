'use strict';

console.log('WebSocket chat bot loading modules...')
const WebSocket = require('ws');

//const ws_server = 'ws://localhost:8035/';
const ws_server = 'ws://kljh.herokuapp.com/';
console.log('WebSocket chat bot connecting to '+ws_server+' ...');
const ws = new WebSocket(ws_server);

const topic = "big_corp";
const id = "botty_boss";

ws.on('open', function open() {
    console.log('WebSocket chat bot connected');
    ws.send(JSON.stringify({ type: "subscribe", topic: topic, id: id }));
    
    setTimeout(special_offers, 5000);
});

ws.on('message', function incoming(data) {
    console.log(data);
    
    var msg = JSON.parse(data);
    switch (msg.type) {
        case "msg_rcv":
            alexa(msg);
            break;
        default:
            console.warn("unhandled message", msg);
            break;
        
    }
});

function special_offers() {
    var articles = [ "ASPARAGUS", "CHAMELS", "SAUERKRAUT", "SUSPENDERS" ]
    var article  = articles[Math.floor(articles.length*Math.random())];
    var txt = "*** SPECIAL DISCOUNT ON "+article+" TODAY *** ";
    ws.send(JSON.stringify({ type: "publish", topic: topic, id: id, txt: txt }), function(err) {} ); 
    
    setTimeout(special_offers, 30000*(1+5*Math.random()));
}

var message_count = 0;
function alexa(msg) {
    var re_reply = [
        [ /buy/i, "Our price is yours."],
        [ /suspender/i, "What about you go out and exercise ?"],
        [ /aspara/i, "Did you know, only a fraction of the population can smell it"],
        [ /b.*ch/i, "French people can't pronounce English properly. I'm silicium but no rock."],
        [ /where/i, "Le japon si tu n'es pas un cornichon.."],
        ];
    
    for (var i=0; i<re_reply.length; i++) {
        var re = re_reply[i][0];
        var txt = re_reply[i][1];
        if (re.test(msg.txt))
            return ws.send(JSON.stringify({ type: "publish", topic: topic, id: id, txt: txt }));
    }
    
    var txt = "";
    message_count++;
    for (var i=0; i<message_count; i++) txt += "really ";
    txt = "I'm "+txt+"sorry to hear that..."
    if (i>2 && Math.random()>0.4) txt = "What can I do to help you?";
    if (i>4 && Math.random()>0.6) txt = "Your satisfaction is important to us.";
    ws.send(JSON.stringify({ type: "publish", topic: topic, id: id, txt: txt + " (" + msg.txt + ")" })); 
    console.log('msg to client: %s', txt);

    if (i>5 && Math.random()>0.9) { 
        txt = "Looking forward to see you again.";
        ws.send(JSON.stringify({ type: "publish", topic: topic, id: id, txt: txt })); 
        console.log('msg to client: %s', txt);
    }
}    