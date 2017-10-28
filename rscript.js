'use strict';

/*

=XlHttpRequest("http://localhost:8085/rscript","{ ""request_name"" : ""host_info"" }")
*/

const fs = require("fs");
//const requestify = require('requestify');

const global_vars = { fs: fs, xl_rpc_promise: xl_rpc_promise, xl_rpc_stub: xl_rpc_stub, xl_rpc_stubs: xl_rpc_stubs };

function rscript_install(app) {

    // http://localhost:8085/rscript?request={"request_name":"host_info"}

    app.use('/rscript', function (req, res) {
        var request = req.method=="GET" ? req.query : req.body;

        rscript(request, req.query)
        .then(function(data) {
            if (typeof data == "number")
                data = ""+data;
            if (typeof data == "object")
                data = JSON.stringify(data, null, 4);
            res.send(data);
        })
        .catch(function(err) {
            res.send({ error: err.message || err, stack: err.stack });
        })
    });

    // xl_rpc_promise needs to have global scoped in order to be used in functions stubs, e.g. new Function("args", "body calling xl_rpc_promise");
    global.xl_rpc_promise = xl_rpc_promise;

    global.top_left = top_left;
}


function rscript(request, opt_prms) {
    return Promise.resolve()
    .then(function() {
        if (request && request.substr)
            request = JSON.parse(request);
        else if (request && request.request && !request.request_name)
            request = JSON.parse(request.request);

        var prms = opt_prms || {};

        var request_name = request.request_name;
        if (!request_name) throw new Error("missing request_name");
        var request_src = request_name.split(".").shift();
        var request_txt = request_name.split(".").pop();

        var uri = request_src+".js";

        return readFilePromise(uri, "utf8")
        .then(function (data) {
            var fct_body = data + "\n\n"
                + "return "+ request_txt + "(request, session_id);\n"
            var fct = new Function("request", "session_id", "global_vars", fct_body);
            var res_or_promise = fct(request, prms.session_id, global_vars);
            if (res_or_promise===undefined) throw new Error("call to "+request+" returned undefined");
            return res_or_promise;
        });
    });
}

var xl_rpc_stub_all_functions;
async function xl_rpc_stub_retrieve_all_functions(session_id) {
    if (!xl_rpc_stub_all_functions)
    {
        try {
            var tmpa = await xl_rpc_promise(session_id, "XlRegisteredFunctions");
            var tmpb = array2d_to_objectarray(tmpa);
            var tmpo = {};
            for (var i=0; i<tmpb.length; i++) {
                var fct_name = tmpb[i].fct || tmpb[i].name || tmpb[i].Name || tmpa[i][0];
                tmpo[fct_name] = tmpb[i];
            }
            xl_rpc_stub_all_functions = tmpo;
        } catch (e) {
            console.error("xl_rpc_stub_retrieve_all_functions", e);
        }
    }
    return true;
}
async function xl_rpc_stub(fct_name, session_id) {
    var bDone = await xl_rpc_stub_retrieve_all_functions(session_id);

    var fct = xl_rpc_stub_all_functions[fct_name];
    if (!fct) throw new Error("xl_rpc_stub: unknown function '"+fct_name+"'.");

    var fct_args = fct.args || fct.arguments || fct.Args || fct.Arguments;
    var fct_body = 'return xl_rpc_promise('+session_id+', "'+fct_name+'", '+fct_args+');'
    var fct_stub = new Function(fct_args, fct_body);
    //var fct_stub = xl_rpc_stub_all_stubs[fct_name] = new AsyncFunction(fct_args, fct_body);

    return fct_stub;
}
async function xl_rpc_stubs(session_id) {
    var bDone = await xl_rpc_stub_retrieve_all_functions();
    var stubs = {};
    for (var fct_name in xl_rpc_stub_all_functions)
        stubs[fct_name] = await xl_rpc_stub(fct_name, session_id);
    return stubs;
}

function xl_rpc_promise(session_id, xlfct, arg0, arg1, arg2, arg3) {
    var cmd = "xl_udf";
    var args = Array.from(arguments);
    var args_maybe_promises = [...arguments];
    args_maybe_promises.shift(); args_maybe_promises.shift(); // !! two fixed arguments

    return Promise.all(args_maybe_promises)
    .then(function (args) {
        var http_url_get = "http://localhost:9707/?cmd=xl_udf&udf_name=XlSet&arg0=abc&arg1=123";
        var http_url = "http://127.0.0.1:9707/";

        var http_query = {};
		//http_query["session_id"] = session_id;
        if (!session_id)
            console.warn("no session id", xlfct);

        if (1) {
			// GET
			http_query["cmd"] = cmd;
			http_query["udf_name"] = xlfct;
			for (var i=0; i<args.length; i++)
				http_query["arg"+i] = typeof args[i]=="object" ? JSON.stringify(args[i]) : args[i];

			return requestifyGetPromise(http_url, http_query, xlfct);
		} else {
			// POST
			var xl_rpc_body_json = { cmd: cmd, udf_name: xlfct, }
			for (var i=0; i<args.length; i++)
				xl_rpc_body_json["arg"+i] = args[i];
			xl_rpc_body_json = JSON.stringify(xl_rpc_body_json, null, 4);

			return requestifyPostPromise(http_url, http_query, xl_rpc_body_json, xlfct);
		}
    })
    .then(function (reply_body) {
        //console.error("xl_rpc_promise: xlfct:"+xlfct+" http  body:"+reply_body.substr(0,50));

        var reply = reply_body;
        if (reply.substr) try{
            // try to parse reply as JSON
            reply = JSON.parse(reply);
            // apply top_left by default
            // ++ reply = top_left(reply);
        } catch(e) {}

        if (reply===undefined)
            throw new Error("xlfct:"+xlfct+"retuned undefined");

        return reply;
    });
}

function to_array2d(v) {
    if (Array.isArray(v[0]))
        return v;
    else
        return objectarray_to_array2d(v);
}

function objectarray_to_array2d(v) {
    var hdr = Object.keys(v[0])
    var res = [ hdr ];
    for (o of v)
        res.push( hdr.map(k => o[k]) );
    return res;
}

function array2d_to_objectarray(v) {
    var hdrs = v[0];
    var res = [];
    for (var i=1; i<v.length; i++) {
        var row = {};
        for (var j=0; j<hdrs.length; j++)
            row[hdrs[j]] = v[i][j]
        res.push(row);
    }
    return res;
}

function top_left(x) {
    if (Array.isArray(x) && x.length==1 &&
        Array.isArray(x[0]) && x[0].length==1)
        return x[0][0];
    else
        return x;
}

module.exports = {
    install: rscript_install,
    rscript_install: rscript_install
};




function readFilePromise(path, encoding) {
    return new Promise(function(resolve, reject) {
        fs.readFile(path, encoding, (err, data) => {
            if(err)
                reject(err);
            else
                resolve(data)
        });
    });
}

const http = require("http");
function requestifyGetPromise(url, query, hint) {
    return new Promise(function(resolve, reject) {
        try {
            var q = "";
            for (var k in query) {
                var v = query[k];
                q += (q==""?"?":"&") + k + "=" + encodeURIComponent(v);
            }
            
            var r = http.get({
                    hostname: 'localhost',
                    port: 9707,
                    path: '/' + q,
                }, function(response) {
                    response.setEncoding('utf8');
                    
                    var body = '';
                    response.on('data', function(d) {
                        body += d;
                    });

                    response.on('end', function() {
                        resolve(body);
                    });
                }
            )
            .on('error', function(err) {
                reject(err);
            });

        } catch(err) {
            reject(err);
        }
    });
}

/*
// HTTP REQUEST PROMISE USING AXIOS
const axios = require("axios");
function requestifyGetPromiseAxios(url, query, hint) {
    return axios({
			url: url,
			method: 'get',
			params: query,
			//data: body
        })
        .catch(err => {
            return Promise.reject(err);
        });;
}
*/

/*
// HTTP REQUEST PROMISE USING REQUESTIFY
function requestifyGetPromise0(uri, query, hint) {
    return new Promise(function(resolve, reject) {
        function http_callback(res) {
            if (!res)
                return reject("xl_rpc_promise: (no res) ");

            if (res.errno)
                return reject("xl_rpc_promise: (http) "+res);

            var status, headers, body;
            try {
                status = res.getCode();
                headers = res.getHeaders();
                body = res.getBody();
            } catch(e) {}

            if (status===undefined || status>=300)
                return reject("xl_rpc_promise: http status: "+status+" "+(hint||""));

            resolve(body);
        }

        requestify.get(uri).then(http_callback).fail(http_callback);
    });
}
*/