import fs = require('fs');
import path = require('path');
import express = require("express");
import formidable = require('formidable');
import aws3 = require("@aws-sdk/client-s3");

// Credentials from 
// 1. AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
// 2. the files at ~/.aws/credentials and ~/.aws/config
// See https://www.npmjs.com/package/@aws-sdk/credential-provider-node
const s3c = new aws3.S3Client({}); 
const root_path = require('path').dirname(require.main.filename);
    
export function register(app: express.Application, clean_up_handlers: Array<() => Promise<any>>) {

    fs.mkdir(path.join(root_path, 'uploads'), function() {});

    app.use('/upload', upload);
    app.get('/uploads/:filename', upload_get);
}

function upload(req: express.Request, res: express.Response) {
    //var me = whoami(req);
    //if (!me||!me.name) return res.sendStatus(403);

    var content_type = req.headers["content-type"];
    if (content_type=="application/octet-stream") {
        upload_octet_stream(req, res);
    } else {
        upload_form(req, res);
    }
}

function upload_octet_stream(req: express.Request, res: express.Response) {
    // (local storage get deleted on restart)
    // fs.writeFile(local_path, req.body, function(err) {
    //    res.send({ error: err, url: httpd_path });
    // });

    var aws_path = "uploads/" + req.query.path;
    s3c.send(new aws3.PutObjectCommand({
        Bucket: "kljhapp",
        Key: aws_path,
        Body: req.body,
        //ACL: "public-read"
        }))
    .then(s3_res => {
        res.send({ msg: `S3 PutObject OK.\n${s3_res}`, url: "https://kljhapp.s3.eu-west-3.amazonaws.com/" + aws_path }); 
    })
    .catch(err => {
        res.status(500).send({ error: `S3 PutObject error.\n${err}` });
    });
}

function upload_form(req: express.Request, res: express.Response) {
    // "multipart/form-data; boundary=----WebKitFormBoundary..."
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(root_path, 'uploads'); // store directory
    form.multiples = false; // allow multiple files in a single request

    // every time a file has been uploaded successfully
    form.on('file', function(field, file) {
        // rename it to it's original name
        // (local storage get deleted on restart)
        // (must wait for S3 upload to complete) 
        // fs.rename(file.path, path.join(form.uploadDir, file.name), err => {});

        // upload to S3
        fs.readFile(file.path, function (err, data) {
            if (err) 
                console.error(`couldn't read ${file.name} (${file.path})`);
            
            var aws_path = "uploads/" + file.name;
            s3c.send(new aws3.PutObjectCommand({
                Bucket: "kljhapp",
                Key: aws_path,
                Body: data,
                ACL: "public-read" 
                }))
            .then(s3_res => {
                res.send({ msg: `S3 PutObject OK.\n${s3_res}`, url: "https://kljhapp.s3.eu-west-3.amazonaws.com/" + aws_path }); 
            })
            .catch(err => {
                res.status(500).send({ error: `S3 PutObject error.\n${err}` });
            });
        });
    });

    form.on('error', function(err) {
        try {
            res.send({ error: err, error_message: err.message, error_stack: err.stack, error_context: 'form upload error' });
        } catch(e) {
            res.send({ error: 'form upload error\n' + err });
        }
    });

    form.on('end', function() {
        // callback 'end' called before 'file' so it's premature to reply to caller
        // res.send('upload success');
    });

    // parse the incoming request containing the form data
    form.parse(req);
}

function upload_get(req: express.Request, res: express.Response) {
    //res.send(req.params.filename);
    res.sendFile(path.join(__dirname, 'uploads', req.params.filename));
}
