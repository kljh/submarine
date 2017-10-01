const fs = require("fs");
const requestify = require('requestify'); 

const global_vars = { fs: fs, xl_rpc_promise: xl_rpc_promise };

function rscript_install(app) {

    // http://localhost:8085/rscript?request={"request_name":"host_info"}
    
    app.use('/rscript', function (req, res) {
        var request = req.method=="GET" ? req.query : req.body;
        
        rscript(request, req.request)
        .then(function(data) { 
            if (typeof data == "number")
                data = ""+data;
            res.send(data); 
        })
        .catch(function(err) { 
            res.send({ error: err.message || err, stack: err.stack }); 
        })
    });

}


function rscript(request, opt_prms) {
    return new Promise(function(resolve, reject) {
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
        fs.readFile(uri, "utf8", function (err, data) {
            if (err) reject(err);

            var fct_body = data + "\n\n" 
                + "return "+ request_txt + "(request);\n"
            var fct = new Function("request", "global_vars", fct_body);
            var res_or_promise = fct(request, global_vars);
            Promise.resolve(res_or_promise)
            .then(res => resolve(res))
            .catch(err => reject(err));
        });
    });
}

function xl_rpc_promise(xlfct, arg0, arg1, arg2, arg3) {
    var args = Array.from(arguments);
    var args = [...arguments];

    return new Promise(function (resolve, reject) {
        var http_callback = function(res) {
            if (res.errno)
                reject("xl_rpc_promise: (http) "+res);

            try {
                var status = res.getCode();
                var headers = res.getHeaders();
                var reply_body = res.getBody();
                
                resolve(reply_body);
            } catch (err) {
                reject("xl_rpc_promise: "+(err.message||err));
            }
        };
    
        var http_url_get = "http://localhost:9707/?cmd=xl_udf&udf_name=XlSet&arg0=abc&arg1=123";
        var http_url = "http://localhost:9707/";
        console.log("http_url:", http_url);

        // !! not URL encoded !!
        var xl_rpc_urlenc = "?cmd=xl_udf&udf_name="+xlfct
        for (var i=1; i<args.length; i++)
            xl_rpc_urlenc += "&arg"+(i-1)+"="+(typeof args[i]=="object" ? JSON.stringify(args[i]) : args[i]);
        
        var xl_rpc_body_json = { cmd: "xl_udf", udf_name: xlfct, }
        for (var i=1; i<args.length; i++)
            xl_rpc_body_json["arg"+(i-1)] = args[i];
        xl_rpc_body_json = JSON.stringify(xl_rpc_body_json, null, 4);

        //requestify.get(http_url+xl_rpc_urlenc).then(http_callback).fail(http_callback);
        requestify.post(http_url, xl_rpc_body_json).then(http_callback).fail(http_callback);
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
    }
    return res;
}

module.exports = {
    install: rscript_install,
    rscript_install: rscript_install 
};
