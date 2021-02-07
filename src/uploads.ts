import fs = require('fs');
import path = require('path');
import formidable = require('formidable');
import aws = require("@aws-sdk/client-s3");

export function register(app, clean_up_handlers: Array<() => Promise<any>>) {

    fs.mkdir(path.join(__dirname, 'uploads'), function() {});

    app.use('/upload', upload);
    app.get('/uploads/:filename', upload_get);
}

function upload(req, res) {
    //var me = whoami(req);
    //if (!me||!me.name) return res.sendStatus(403);

    var httpd_path = '/uploads/' + req.query.path;
    var local_path = path.join(__dirname, 'uploads', req.query.path);

    var content_type = req.headers["content-type"];
    if (content_type=="application/octet-stream") {
        fs.writeFile(local_path, req.body, function(err) {
            res.send({ error: err, url: httpd_path });
        })
        return;
    }

    // "multipart/form-data; boundary=----WebKitFormBoundary..."
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, 'uploads'); // store directory
    form.multiples = true; // allow multiple files in a single request

    // every time a file has been uploaded successfully,  rename it to it's orignal name
    form.on('file', function(field, file) {
        fs.rename(file.path, path.join(form.uploadDir, file.name), err => {});
    });

    form.on('error', function(err) {
        try {
            res.send({ error: err, error_message: err.message, error_stack: err.stack, error_context: 'form upload eror' });
        } catch(e) {
            res.send({ error: 'form upload eror\n' + err });
        }
    });

    form.on('end', function() {
        res.send('upload success');
    });

    // parse the incoming request containing the form data
    form.parse(req);
}

function upload_get(req, res) {
    //res.send(req.params.filename);
    res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
}
