const url = require('url');
const fs = require('fs');
const path = require('path');
//const cfg_file = require('./config.json');

/*

\\localhost@8080\DavWWWRoot\

*/

module.exports = {
    bDebug : false,
    webdav_init: webdav_init,
    webdav_options: webdav_options,
    webdav_mkcol: webdav_mkcol,
    webdav_move: webdav_move,
    webdav_copy: webdav_copy,
    webdav_delete: webdav_delete,
    webdav_propfind: webdav_propfind,
    webdav_proppatch: webdav_proppatch,
    webdav_lock: webdav_lock,
    webdav_unlock: webdav_unlock,
};


// -------------------------------------------------------------------------------------------------------------------

function root_path() {
    return module.exports.root_path || path.join(process.cwd(), module.exports.bDebug?"debug":"");
}

function webdav_log_request(req) { 
    console.log("request headers:\n"+JSON.stringify(req.headers,null,4)+"\n");
}

function webdav_options(req, res) {
    var opts = {
        'Content-Length': '0',
        'Allow': 'HEAD, GET, PUT, POST, DELETE, OPTIONS, PROPFIND, PROPPATCH, MKCOL, MOVE, COPY, LOCK, UNLOCK, TRACE, REPORT', 
        'DAV': '1,2',
        'MS-Author-Via': 'DAV', // mandatory for WinXP
        //Allow Content-Type: text/xml
    };

    console.log(JSON.stringify(opts,null,4));
    res.writeHead(200, opts);
    res.end();
}


function webdav_put(req, res) {
    var url_path = unescape(url.parse(req.url).pathname);
    var full_path = path.join(root_path(), url_path);
    
    var content_type = req.headers["content-type"];
    var content_length = req.headers["content-length"];
    try {
        fs.writeFile(full_path, req.body, function(err) {
            if (err) {
                console.error(err);         
                res.writeHead(500, {});
                res.send({ error: err, url: url_path });
                res.end();
            } else {
                res.end();
            }
        })
    } catch(e) {
        console.error(err)
        res.writeHead(500, {});
        res.send({ error: err, url: url_path });
        res.end();
    }
}

function webdav_mkcol(req, res) {
    var url_path = unescape(url.parse(req.url).pathname);
    var full_path = path.join(root_path(), url_path);

    var bExist = fs.exists(full_path);

    if (bExist) {
        var status_forbidden = 403;
        res.writeHead(status_forbidden, {});
        res.end("");
        return;
    } 

    try {
        //fs.mkdirSync(full_path);
        recursive_mkcol(full_path);

        var status_created = 201;
        res.writeHead(status_created, {});
        res.end("");
    } catch (e) {
        console.log("EXCEPTION MKCOL "+e);
        var status_conflict = 409;
        res.writeHead(status_conflict, {});
        res.end("");
    }
}

function recursive_mkcol(folder_path) {
    //console.log("recursive_mkcol: "+folder_path);
    var path_split = folder_path.split(path.sep);

    for (var i=1; i<path_split.length; i++) {
        var curr_path = path_split.slice(0, i+1).join(path.sep);
        if (!fs.existsSync(curr_path)) {
            fs.mkdirSync(curr_path); 
        } else {
            var stat = fs.statSync(curr_path);
            if (stat.isDirectory()) {
                //console.log("recursive_mkcol: "+curr_path+" already a directory.");
            } else {
                throw new Error("recursive_mkcol: "+curr_path+" already exists.");
            }
        }
    }

    return true;
}


function webdav_move(req, res) {
    var src_url_path = unescape(url.parse(req.url).pathname);
    var src_full_path = path.join(root_path(), src_url_path);
    console.log("HTTP MOVE src: "+src_full_path);
    
    var dst_url_path = unescape(req.headers['destination']);
    console.log("HTTP MOVE dst: "+dst_url_path);
    if (dst_url_path.substr(0,4)=="http") {
        dst_url_split = dst_url_path.split("/");
        dst_url_split.shift();
        dst_url_split.shift();
        dst_url_split.shift();
        dst_url_path = dst_url_split.join("/");
    }
    var dst_full_path = path.join(root_path(), dst_url_path);
    console.log("HTTP MOVE dst: "+dst_full_path);
    
    try {
        fs.renameSync(src_full_path, dst_full_path);

        var status_created = 201;
        res.writeHead(status_created, {});
        res.end("");
    } catch (e) {
        console.log("EXCEPTION MOVE "+e);
        var status_conflict = 409;
        res.writeHead(status_conflict, {});
        res.end("");
    }
}


function webdav_copy(req, res) {
    var src_url_path = unescape(url.parse(req.url).pathname);
    var src_full_path = path.join(root_path(), src_url_path);
    console.log("HTTP COPY src: "+src_full_path);
    
    var dst_url_path = unescape(req.headers['destination']);
    console.log("HTTP COPY dst: "+dst_url_path);
    if (dst_url_path.substr(0,4)=="http") {
        dst_url_split = dst_url_path.split("/");
        dst_url_split.shift();
        dst_url_split.shift();
        dst_url_split.shift();
        dst_url_path = dst_url_split.join("/");
    }
    var dst_full_path = path.join(root_path(), dst_url_path);
    console.log("HTTP COPY dst: "+dst_full_path);
    
    try {
        copy_file(src_full_path, dst_full_path);

        var status_created = 201;
        res.writeHead(status_created, {});
        res.end("");
    } catch (e) {
        console.log("EXCEPTION COPY "+e);
        var status_conflict = 409;
        res.writeHead(status_conflict, {});
        res.end("");
    }
}

function copy_file(source, target, cb) {
    var done_called = false;

    var r = fs.createReadStream(source);
    r.on("error", function(err) {
        done(err);
    });
    var w = fs.createWriteStream(target);
    w.on("error", function(err) {
        done(err);
    });
    w.on("close", function(ex) {
        done();
    });
    r.pipe(w);

    function done(err) {
        if (!done_called) {
            if (cb) cb(err);
            done_called = true;
        }
    }
}


function webdav_delete(req, res) {
    var url_path = unescape(url.parse(req.url).pathname);
    var full_path = path.join(root_path(), url_path);

    var bExist = fs.existsSync(full_path);
    if (!bExist) {
        console.log("NOT FOUND "+JSON.stringify(full_path));

        var status_not_found = 404;
        res.writeHead(status_not_found, {});
        res.end("");
        return;
    } 

    
    try {
        var stat = fs.statSync(full_path);
        if (stat.isDirectory()) {
            console.log("recursive_delete / fs.rmdirSync "+full_path);
            //fs.rmdirSync(full_path);
            recursive_delete(full_path);
        } else {
            console.log("fs.unlinkSync "+full_path);
            fs.unlinkSync(full_path);
        }

        var status_no_content = 204;
        res.writeHead(status_no_content, {});
        res.end("");
    } catch (e) {
        console.log("EXCEPTION DELETE "+e.stack);
        var status_conflict = 409;
        res.writeHead(status_conflict, {});
        res.end("");
    }
}

function recursive_delete(folder_path) {
    var files = fs.readdirSync(folder_path);
    
    for (var i=0, n=files.length; i<n; i++) {
        var full_path = path.join(folder_path,files[i]);
        console.log("del path="+JSON.stringify(full_path));
       // try {
            var stat = fs.statSync(full_path);
            console.log("del dir="+stat.isDirectory()+" path="+JSON.stringify(full_path));
            if (stat.isDirectory()) 
                recursive_delete(full_path);
            else
                fs.unlinkSync(full_path);
        //} catch (e) {}
    }
    fs.rmdirSync(folder_path);
}


function webdav_propfind(req, res) {
    var xml_header =
        '<?xml version="1.0" encoding="utf-8"?>\n' + 
        '<D:multistatus' +
        //' xmlns:cs="http://calendarserver.org/ns/"' + 
        //' xmlns:cal="urn:ietf:params:xml:ns:caldav"' + 
        //' xmlns:card="urn:ietf:params:xml:ns:carddav"' + 
        ' xmlns:d="DAV:">\n';
    var xml_footer = 
        '</D:multistatus>';
    
    var depth = req.headers['depth'] * 1;
    
    var url_path = unescape(url.parse(req.url).pathname);
    var full_path = path.join(root_path(), url_path);

    var bExists = fs.existsSync(full_path);
    if ( !bExists ) {
        console.log("UNKNOWN PATH !! "+url_path);
        //webdav_log_request(req);

        res.writeHead(404, {});
        res.end(reply_body);
        return;
    }
    
    if (depth===0) {

        var reply_body = xml_header + webdav_propfind_response(url_path, req) + xml_footer;;

        res.writeHead(207, {
            'Content-type': 'application/xml; charset=utf-8', 
            'DAV': '1,2'
        });
        res.end(reply_body);
   
    } else {
        // depth > 0

        var reply_body = xml_header;
        reply_body += webdav_propfind_response(url_path, req); // list also the root of the folder

        fs.readdir(full_path, function(err, files) {
            var f = files.sort();
            if (err) {
                response.writeHeader(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }

            var from_url = url_path + ( url_path.substr(-1)=="/" ? "" : "/" );
            for (var i=0, n=f.length; i<n; i++) {
                reply_body += webdav_propfind_response(url.resolve(from_url, escape(f[i])), req);
            } 

            reply_body += xml_footer;
        
            var multi_status = 207;  // Multi-Status
            res.writeHead(multi_status, {
                'Content-type': 'application/xml; charset=utf-8', 
                'DAV': '1,2'
            });

            //console.log(reply_body)
            res.end(reply_body);
        });
                
    }

}

function webdav_propfind_response(url_path, req) {
    var requested_fields = [];
    var full_path = path.join(root_path(), unescape(url_path));

    var stat = fs.statSync(full_path);
    var size = stat ? stat.size : 0;
    var last = stat ? stat.mtime.toUTCString() : undefined; // Sat, 26 Dec 2015 15:38:20 GMT+00:00
    var crea = stat ? stat.ctime.toISOString() : undefined; // 2017-08-30T21:13:09Z
    var coll = stat ? stat.isDirectory() : false;
    
    var href_prefix = req.protocol + "://" + req.headers.host; // "http://localhost:8080";
    var href = href_prefix + url_path + ( coll && !endsWith(url_path,"/") ? "/" : "" );
    
    var path_split = url_path.split("/");
    var name = path_split.pop();
    if (name=="") name = path_split.pop();
    if (name=="") name = "root";

    // skip invisible files
    if (name[0]=='.')
        return ""; 

    var lock_stuff = 
        '        <D:lockdiscovery></D:lockdiscovery>\n' +
        '        <D:supportedlock>\n' +
        '          <D:lockentry>\n' +
        '            <D:lockscope><D:exclusive/></D:lockscope>\n' +
        '            <D:locktype><D:write/></D:locktype>\n' +
        '          </D:lockentry>\n' +
        '        </D:supportedlock>\n';
        
    var response = 
        //'  <D:response>\n' + 
        '  <D:response xmlns:xt1="http://apache.org/dav/props/" xmlns:xt2="http://subversion.tigris.org/xmlns/dav/" xmlns:Z="urn:schemas-microsoft-com:">' +
        '    <D:href>'+href+'</D:href>\n' +
        '    <D:propstat>\n' +
        '      <D:prop>\n';

    if (coll) {
        var mime = "httpd/unix-directory";
        response += 
            //'        <D:creationdate/>\n' +                                    // ISO 8601
            '        <D:creationdate>'+crea+'</D:creationdate>\n' + 
            //'        <D:displayname>'+name+'</D:displayname>\n' +              // Sounds ou temp-1687654484.tmp
            //'        <D:name>'+name+'</D:name>\n' +                            // Sounds ou temp-1687654484.tmp
            //'        <D:getcontentlength/>\n' +
            '        <D:getcontentlength>0</D:getcontentlength>\n' +
            '        <D:getcontenttype>'+mime+'</D:getcontenttype>\n' +
            '        <D:getlastmodified>'+last+'</D:getlastmodified>\n' +      // RFC 1123
            '        <D:resourcetype><D:collection/></D:resourcetype>\n' +     // collection = folder
            // NOT IN RFC 4918 :
            //'        <D:iscollection>TRUE</D:iscollection>\n' +                // collection = folder
            //'        <D:isreadonly>TRUE</D:isreadonly>\n' +
            lock_stuff +
            '';
            
    } else {
        var mime = path_to_mime(name);
        response += 
            '        <D:creationdate>'+crea+'</D:creationdate>\n' + 
            '        <D:displayname>'+name+'</D:displayname>\n' +
            '        <D:name>'+name+'</D:name>\n' +
            '        <D:getcontentlength>'+size+'</D:getcontentlength>\n' +
            '        <D:getcontenttype>'+mime+'</D:getcontenttype>\n' +
            '        <D:getlastmodified>'+last+'</D:getlastmodified>\n' +
            '        <D:resourcetype/>\n' +
            // NOT IN RFC 4918 :
            //'        <D:iscollection>FALSE</D:iscollection>\n' +
            //'        <D:isreadonly>TRUE</D:isreadonly>\n' +
            lock_stuff +
            '';
    }
    console.log(href+"\n  "+name+"\n  "+crea+"\n  "+last+"\n  "+size+" "+mime);

    response += 
        '      </D:prop>\n' +
        '      <D:status>HTTP/1.1 200 OK</D:status>\n' +
        '    </D:propstat>\n';

    if (requested_fields) response += 
        '    <D:propstat>\n' +
        '      <D:prop>\n' +
        '        <D:isroot/>\n' +
        '        <D:lastaccessed/>\n' +
        '        <D:isstructureddocument/>\n' +
        '        <D:parentname/>\n' +
        '        <D:defaultdocument/>\n' +
        '        <D:ishidden/>\n' +
        '        <D:contentclass/>\n' +
        '        <D:getcontentlanguage/>\n' +
        '        <D:getetag/>\n' +
        '        <D:source/>\n' +
        '      </D:prop>\n' +
        '      <D:status>HTTP/1.1 404 Not Found</D:status>\n' +
        '    </D:propstat>\n';

    response +=
        '  </D:response>\n';

    return response;
}

function webdav_proppatch(req, res) {
    webdav_log_request(req);
    
    res.writeHead(200, {});
    res.end();
}

function webdav_lock(req, res) {
    //webdav_log_request(req);
    var reply_body = 
        '<?xml version=\"1.0\" encoding=\"utf-8\" ?>\n' +
        '<D:prop xmlns:D=\"DAV:\">\n' +
        '  <D:lockdiscovery>\n' +
        '    <D:activelock>\n' +
        '      <D:locktoken>\n' +
        '        <D:href>urn:uuid:e71d4fae-5dec-22d6-fea5-'+(new Date).getTime()+'</D:href>\n' +
        '      </D:locktoken>\n' +
        '    </D:activelock>\n' +
        '  </D:lockdiscovery>\n' +
        '</D:prop>\n';

    res.writeHead(200, { 'content-type': 'application/xml; charset=utf-8' });
    res.end(reply_body);
}

function webdav_unlock(req, res) {
    var status_no_content = 204;
    res.writeHead(status_no_content, {});
    res.end();
}

function path_to_mime(path) {
    var extension = path.split('.').pop();
    if (extension=="html" || extension=="css" || extension=="csv")
        return "text/"+extension;
    if (extension=="txt")
        return "text/plain";
    if (extension=="json")
        return "application/"+extension;
    if (extension=="js")
        return "application/javascript";
    if (extension=="bin")
        return "application/octet-stream";
    if (extension=="png" || extension=="jpeg" || extension=="jpg" || extension=="gif")
        return "image/"+extension;
    if (extension=="mpeg" || extension=="mp4" || extension=="webm")
        return "video/"+extension;
    if (extension=="webapp") // || path.split('/').pop=="manifest.json")
        return "application/x-web-app-manifest+json";
    return "application/"+extension;
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function webdav_init(cfg_args) {
    console.log("HTTP WebDav under Win7: \\\\localhost@"+cfg_args.http_port+"\\DavWWWRoot")
    
    function webdav_handler(req, res, next) {
        if ([ 'HEAD', 'GET', 'PUT', 'POST' ].indexOf(req.method)==-1)
            console.log("webdav", req.method, req.body || "(no body)" );

        switch (req.method) {
            case 'HEAD':
            case 'GET':
            case 'POST':
            // business as usual
                next();
                break;

            case 'PUT':
                return webdav_put(req, res);

            case 'OPTIONS':
                return webdav_options(req, res);
            case 'MKCOL':
                return webdav_mkcol(req, res);
            case 'MOVE':
                return webdav_move(req, res);
            case 'COPY':
                return webdav_copy(req, res);
            case 'DELETE':
                return webdav_delete(req, res);
            
            case 'PROPFIND':
                return webdav_propfind(req, res);
            case 'PROPPATCH':
                return webdav_proppatch(req, res);
            case 'LOCK':
                return webdav_lock(req, res);
            case 'UNLOCK':
                return webdav_unlock(req, res);
            
            default:
                // unexpected HTTP method
                console.warn("webdav unexpected HTTP method", req.method);
                next();
        }
    }
    
    return webdav_handler;
}

