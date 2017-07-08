$(function() {

$.get("/whoami");

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
/*var*/ id = uri_args()["id"] || ("little "+(new Date().toISOString().replace(/:/g,'')));
/*var*/ topic = uri_args()["topic"] || "big_corp";

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
        //animateMessage(message);
        
        // send msg to server 
        try {
            ws.send(JSON.stringify({ type: "publish", topic: topic, loopback: false, id: id, txt: input.value }), 
                function() { animateMessage(message); 
            }); 
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
        if (tick) tick.classList.remove('tick-animation');
    }, 500);
}

ws_init({
        onopen: function(ev) {
            newBotMessage("connected with server &#x1F604;")
            ws.send(JSON.stringify({ type: "subscribe", topic: topic, id: id }));
            $(".status").text("connected");
        },
        onreopen: function(ev) {
            newBotMessage("reconnected with server &#x1F62C;.")
            ws.send(JSON.stringify({ type: "subscribe", topic: topic, id: id }));
            $(".status").text("connected");
        },
        onclose: function(ev) {
            newBotMessage("connection lost  &#x1F613;!")
            $(".status").text("offline");
        },
        onerror: function(ev) {
            newBotMessage("connection error  &#x1F613;!<br/>"+ev)
            $(".status").text("offline (error)");
        },
        onjson: function(ev, msg) {
            switch (msg.type) {
                case "msg_rcv":
                    var txt = msg.txt;
                    if (msg.data_url)
                        txt = '<img src="'+msg.data_url+'" style="max-width:250px;"><br/>' 
                            + '<a href="'+msg.data_url+'" class="link_to_data_url" target="_blank">'+txt+'</a>';
                    newBotMessage(txt, msg.id);
                    $(".link_to_data_url").click(function() {
                        alert("link_to_data_url");
                    });
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


function setEditableChangeEvent(id, fct) {
    var elnt = document.querySelector('#user_id');
    var timeout_id;
    elnt.addEventListener('DOMCharacterDataModified', function() { 
        if (timeout_id) window.clearTimeout(timeout_id);
        timeout_id = window.setTimeout(fct, 800);
    }, false);
    elnt.addEventListener('input', function() {
        if (timeout_id) window.clearTimeout(timeout_id);
        timeout_id = window.setTimeout(fct, 800);
    }, false);
}
function MD5(s){function L(k,d){return(k<<d)|(k>>>(32-d))}function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H)}if(I|d){if(x&1073741824){return(x^3221225472^F^H)}else{return(x^1073741824^F^H)}}else{return(x^F^H)}}function r(d,F,k){return(d&F)|((~d)&k)}function q(d,F,k){return(d&k)|(F&(~k))}function p(d,F,k){return(d^F^k)}function n(d,F,k){return(F^(d|(~k)))}function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F)}function f(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F)}function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F)}function t(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F)}function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]| (G.charCodeAt(H)<<d));H++}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa}function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2)}return k}function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x)}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128)}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128)}}}return d}var C=Array();var P,h,E,v,g,Y,X,W,V;var S=7,Q=12,N=17,M=22;var A=5,z=9,y=14,w=20;var o=4,m=11,l=16,j=23;var U=6,T=10,R=15,O=21;s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],Q,3905402710);W=u(W,V,Y,X,C[P+2],N,606105819);X=u(X,W,V,Y,C[P+3],M,3250441966);Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],Q,1200080426);W=u(W,V,Y,X,C[P+6],N,2821735955);X=u(X,W,V,Y,C[P+7],M,4249261313);Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],Q,2336552879);W=u(W,V,Y,X,C[P+10],N,4294925233);X=u(X,W,V,Y,C[P+11],M,2304563134);Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],Q,4254626195);W=u(W,V,Y,X,C[P+14],N,2792965006);X=u(X,W,V,Y,C[P+15],M,1236535329);Y=f(Y,X,W,V,C[P+1],A,4129170786);V=f(V,Y,X,W,C[P+6],z,3225465664);W=f(W,V,Y,X,C[P+11],y,643717713);X=f(X,W,V,Y,C[P+0],w,3921069994);Y=f(Y,X,W,V,C[P+5],A,3593408605);V=f(V,Y,X,W,C[P+10],z,38016083);W=f(W,V,Y,X,C[P+15],y,3634488961);X=f(X,W,V,Y,C[P+4],w,3889429448);Y=f(Y,X,W,V,C[P+9],A,568446438);V=f(V,Y,X,W,C[P+14],z,3275163606);W=f(W,V,Y,X,C[P+3],y,4107603335);X=f(X,W,V,Y,C[P+8],w,1163531501);Y=f(Y,X,W,V,C[P+13],A,2850285829);V=f(V,Y,X,W,C[P+2],z,4243563512);W=f(W,V,Y,X,C[P+7],y,1735328473);X=f(X,W,V,Y,C[P+12],w,2368359562);Y=D(Y,X,W,V,C[P+5],o,4294588738);V=D(V,Y,X,W,C[P+8],m,2272392833);W=D(W,V,Y,X,C[P+11],l,1839030562);X=D(X,W,V,Y,C[P+14],j,4259657740);Y=D(Y,X,W,V,C[P+1],o,2763975236);V=D(V,Y,X,W,C[P+4],m,1272893353);W=D(W,V,Y,X,C[P+7],l,4139469664);X=D(X,W,V,Y,C[P+10],j,3200236656);Y=D(Y,X,W,V,C[P+13],o,681279174);V=D(V,Y,X,W,C[P+0],m,3936430074);W=D(W,V,Y,X,C[P+3],l,3572445317);X=D(X,W,V,Y,C[P+6],j,76029189);Y=D(Y,X,W,V,C[P+9],o,3654602809);V=D(V,Y,X,W,C[P+12],m,3873151461);W=D(W,V,Y,X,C[P+15],l,530742520);X=D(X,W,V,Y,C[P+2],j,3299628645);Y=t(Y,X,W,V,C[P+0],U,4096336452);V=t(V,Y,X,W,C[P+7],T,1126891415);W=t(W,V,Y,X,C[P+14],R,2878612391);X=t(X,W,V,Y,C[P+5],O,4237533241);Y=t(Y,X,W,V,C[P+12],U,1700485571);V=t(V,Y,X,W,C[P+3],T,2399980690);W=t(W,V,Y,X,C[P+10],R,4293915773);X=t(X,W,V,Y,C[P+1],O,2240044497);Y=t(Y,X,W,V,C[P+8],U,1873313359);V=t(V,Y,X,W,C[P+15],T,4264355552);W=t(W,V,Y,X,C[P+6],R,2734768916);X=t(X,W,V,Y,C[P+13],O,1309151649);Y=t(Y,X,W,V,C[P+4],U,4149444226);V=t(V,Y,X,W,C[P+11],T,3174756917);W=t(W,V,Y,X,C[P+2],R,718787259);X=t(X,W,V,Y,C[P+9],O,3951481745);Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g)}var i=B(Y)+B(X)+B(W)+B(V);return i.toLowerCase()};
console.log(MD5("claude.cochet@gmail.com"))

setEditableChangeEvent('#user_id', function(ev) {
    var elnt = document.querySelector('#user_id');
    var h = MD5(elnt.innerText);
    $(".avatar > img").attr("src", "http://gravatar.com/avatar/"+h+"?default=retro");
});

// paper clip and photo icons can be used for file upload (as well as drag and drop onver the UI)
$(".attachment").click(function () {
    $('#inputfile').trigger('click');
});
$(".photo").click(function () {
    $('#inputfile').trigger('click');
});
$('#inputfile').change(function(ev) {
    publish_files(ev.target.files);
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


function publish_files(file_list) {
    console.log("publish #files = " + file_list.length);
    for (var i=0; i<file_list.length; i++)
        publish_file(file_list[i]);
}

function publish_file(f) {
    console.log("publish file name = " + f.name + " size: " + f.size + " lastModified: " + f.lastModified  );

    var reader = new FileReader();
    reader.addEventListener("load", function (ev) {
        var base64_data_url = reader.result;
        var msg = JSON.stringify({ type: "publish", topic: topic, loopback: false, id: id, txt: f.name, data_url: base64_data_url, lastModified: f.lastModified });
        ws.send(msg); 
        console.log(msg.substr(0, 512));
    }, false);
    reader.readAsDataURL(f);
    //reader.readAsText(f);
}

function drop_handler(ev) {
  console.log("Drop");
  ev.preventDefault();
  // If dropped items aren't files, reject them
  var dt = ev.dataTransfer;
  if (dt.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i=0; i < dt.items.length; i++) {
      if (dt.items[i].kind == "file") {
        var f = dt.items[i].getAsFile();
        publish_file(f);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i=0; i < dt.files.length; i++) {
      console.log("... file[" + i + "].name = " + dt.files[i].name);
    }  
  }
}

function dragover_handler(ev) {
  console.log("dragOver");
  ev.preventDefault();
}

function dragend_handler(ev) {
  console.log("dragEnd");
  var dt = ev.dataTransfer;
  if (dt.items) {
    // Use DataTransferItemList interface to remove the drag data
    for (var i = 0; i < dt.items.length; i++) {
      dt.items.remove(i);
    }
  } else {
    // Use DataTransfer interface to remove the drag data
    ev.dataTransfer.clearData();
  }
}