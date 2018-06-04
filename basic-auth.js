'use strict';

const fs = require('fs');
var credentials = { "public": "public" };
try { credentials = JSON.parse(fs.readFileSync('.auth')); } catch (e) { console.error(""+e); }

module.exports = {
    check_autorization: check_autorization
}

var nonce_check_uniqueness = false;
var nonces = new Map();

function check_autorization(request, response) {
    // if no authentication 
    function request_authentication(bStale) {
        var realm = "local node httpd"
        var nonce = "never-twice-"+Date.now();
        var opaque = "server-says-quote-this-text-when-replying";
        console.log("request_authentication: reply 401 Unauthorized", request.path);
        response.status(401)
        response.writeHeader(401, { "WWW-Authenticate": "Digest algorithm=\"MD5\", realm=\""+realm+"\", nonce=\""+nonce+"\", opaque=\""+opaque+"\", qop=\"auth\"" });
        response.write("401 Unauthorized\n");
        response.end();
        
        if (nonce_check_uniqueness) {
            // track generated nonce
            nonces.set(nonce, nonce);
            // delete older nonces if too big
            if (nonces.size>120) 
                for (var kv of nonces) { nonces.delete(kv[0]); break; }
        }

    }
        
    if (!request.headers['authorization']) {
        request_authentication();
        return false;        
    }
    
    var auth = request.headers['authorization'];
    var bAuth = false;
    if (auth.indexOf("Basic")==0) {
        var auth64 = auth.substr(6);
        console.log("authorization base64: "+auth64);

        //var auth = base64_decode(auth64);
        var auth_buff = new Buffer(auth64, 'base64');  // convert base64 to raw binary data held in a string
        var auth = ""+auth_buff;

        var tmp = auth.split(":");
        var user = tmp[0];
        var pwd = tmp[1];
        var pwd_expected = credentials[user];

        console.log("authorization received: "+auth);
        console.log("authorization expected: "+user+":"+pwd_expected);
        bAuth = pwd==pwd_expected;
        console.log("authorization passed: "+bAuth);
    } else if (auth.indexOf("Digest")==0) {
        var auth_split = auth.substr(7).split(",");
        var auth_data = {};
        for (var i=0; i<auth_split.length; i++) {
            var tmp = auth_split[i].trim().split('=');
            var key = tmp.shift().trim();
            var val = tmp.join('=').trim();
            try { val = JSON.parse(val); } catch (e) {}
            auth_data[key] = val;
        }
        
        var crypto = require('crypto');

        function md5(ct) {
            var ha = crypto.createHash('md5').update(ct).digest('hex');
            //console.log("ct: "+ct);
            //console.log("ha: "+ha);
            return ha;

        }
        var ct1 = auth_data.username+":"+auth_data.realm+":"+credentials[auth_data.username]
        var ha1 = md5(ct1);
        var ct2 = request.method+":"+auth_data.uri;
        var ha2 = md5(ct2);
        var rfc = ""
        if (!auth_data.qop) {
            // RFC 2069
            rfc = "RFC 2069"
            var ct3 = ha1+":"+auth_data.nonce+":"+ha2;
            var ha3 = md5(ct3);
        } else { //if (auth_data.qop=="auth" || auth_data.qop=="auth-int")
            // RFC 2617
            rfc = "RFC 2617"
            var ct3 = ha1+":"+auth_data.nonce+":"+auth_data.nc+":"+auth_data.cnonce+":"+auth_data.qop+":"+ha2;
            var ha3 = md5(ct3);
        }
        bAuth = ha3==auth_data.response;
        if (!bAuth) {
            console.log("auth_data: "+JSON.stringify(auth_data,null,4));
            console.log("ha3: "+ha3);            
            console.log("ct1: "+ct1);            
            console.log("ct2: "+ct2);            
            console.log("ct3: "+ct3);            
            console.log("authorization "+rfc+" failed");
        } else {
            if (!nonce_check_uniqueness) {
                //console.log("authorization "+rfc+" passed BUT WE DO NOT CHECK NONCE UNIQUENESS");
            } else if (nonces.has(auth_data.nonce)) {
                // removed used nonce
                //console.log("authorization "+rfc+" passed");
                nonces.delete(auth_data.nonce);
            } else {
                bAuth = false;
                console.warn("auth_data can't recall nonce: "+auth_data.nonce);
            }
        }

    } else {
        console.log("unknown authentication scheme "+auth);
    }

    if (!bAuth) {
        // 403 Forbidden should be used when authentication succeeds but access is forbidden.
        // 401 Unauthorized should be used when authentication is missing of failed.
        request_authentication();
    }
    return bAuth;
}
