/* Meme */
$(function() {

	
var memes = [
	'Dude, you smashed my turtle saying "I\'M MARIO BROS!"',
	'Dude, you grabed seven oranges and yelled "I GOT THE DRAGON BALLS!"',
	'Dude, you threw my hamster across the room and said "PIKACHU I CHOOSE YOU!"',
	'Dude, you congratulated a potato for getting a part in Toy Story',
	'Dude, you were hugging an old man with a beard screaming "DUMBLEDORE YOU\'RE ALIVE!"',
	'Dude, you were cutting all my pinapples yelling "SPONGEBOB! I KNOW YOU\'RE THERE!"',
];

var random = document.querySelector('#random');

random.innerHTML = memes[Math.floor(Math.random() * memes.length)];

/* Time */

var deviceTime = document.querySelector('.status-bar .time');
var messageTime = document.querySelectorAll('.message .time');

try {
	deviceTime.innerHTML = moment().format('h:mm');

	setInterval(function() {
		deviceTime.innerHTML = moment().format('h:mm');
	}, 1000);

	for (var i = 0; i < messageTime.length; i++) {
		messageTime[i].innerHTML = moment().format('h:mm A');
	}
} catch(e) {
	console.warn("chat formating: non critical error", e);
}

/* Message */

var form = document.querySelector('.conversation-compose');
var conversation = document.querySelector('.conversation-container');
var id = uri_args()["id"] || ("little "+(new Date().toISOString().replace(/:/g,'')));
var topic = uri_args()["topic"] || "big_corp";

form.addEventListener('submit', newMessage);

newBotMessage = function(text, id) {
	var message = buildMessage(text, { rcv: true, id: id });
    conversation.appendChild(message);
	animateMessage(message);
    
    conversation.scrollTop = conversation.scrollHeight;
}

function newMessage(e) {
	e.preventDefault();
	e.stopPropagation();
	
	var input = e.target.input;

	if (input.value) {
		var message = buildMessage(input.value);
		conversation.appendChild(message);
		animateMessage(message);
        
        // send msg to server 
		try {
        	ws.send(JSON.stringify({ type: "publish", topic: topic, loopback: false, id: id, txt: input.value })); 
		} catch (e) {
			newBotMessage("message not sent")
		}
	}

	input.value = '';
	conversation.scrollTop = conversation.scrollHeight;
}

function buildMessage(text, opt_prms) {
	var prms = opt_prms || {};
	
	var element = document.createElement('div');

	element.classList.add('message', prms.rcv?'received':'sent');
	if (prms.rcv)
		element.style = "background:"+get_id_color(prms.id)+";";
	
	var html = text;
	
	try {
		html += 
			'<span class="metadata">' +
				'<span class="time">' + moment().format('h:mm A') + '</span>' +
				'<span class="tick tick-animation">' +
					'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" id="msg-dblcheck" x="2047" y="2061"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="#92a58c"/></svg>' +
					'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" id="msg-dblcheck-ack" x="2063" y="2076"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.77a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="#4fc3f7"/></svg>' +
				'</span>' +
			'</span>';
	} catch(e) {
		console.warn("chat formating: non critical error", e);
	}

	element.innerHTML = html;

	return element;
}

function animateMessage(message) {
	setTimeout(function() {
		var tick = message.querySelector('.tick');
		tick.classList.remove('tick-animation');
	}, 500);
}

ws_init({
		onopen: function(ev) {
			newBotMessage("connected with server.")
			ws.send(JSON.stringify({ type: "subscribe", topic: topic, id: id }));
		},
		onclose: function(ev) {
			newBotMessage("connection lost !")
		},
		onjson: function(ev, msg) {
			switch (msg.type) {
				case "msg_rcv":
					newBotMessage(msg.txt, msg.id);
					break;
				case "subscriber_joined":
					newBotMessage(msg.id+" just joined.", msg.id);
					break;
				case "subscriber_left":
					newBotMessage(msg.id+" just left.", msg.id);
					break;
				default:
					console.warn("unhandled message", msg);
					break;
			}
		}
	});

});

var id_colors = {};
function get_id_color(id) {
	if (!id)
		return "lightgrey"; 
	
	if (id_colors[id])
		return id_colors[id];
	
	var nb_id_colors = Object.keys(id_colors).length;
	if (nb_id_colors===0)
		id_colors[id] = "#d1dcff";
	else if (nb_id_colors===1)
		id_colors[id] = "#2c9cd2";
	else if (nb_id_colors===2)
		id_colors[id] = "#d991a2";
	else if (nb_id_colors===3)
		id_colors[id] = "#FFF755";
	else if (nb_id_colors===4)
		id_colors[id] = "#f7a755";
	else 
		id_colors[id] = "#de3322";
			
	return id_colors[id];
}

function uri_args() {
	var tmp = window.location.search.substr(1).split('&');
	var kv = {};
	for (var i=0; i<tmp.length; i++) {
		var key = tmp[i].split('=', 1)[0];
		var val = tmp[i].substr(key.length+1);
		kv[key] = val ? decodeURIComponent(val) : val;
	}
	return kv;
}