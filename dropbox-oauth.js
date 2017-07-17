const requestify = require('requestify'); 
const request = require('request');

var creds;
try { 
    creds = require('./credentials.json').dropbox; 
} catch(e) {
    creds = { id: process.env.DROPBOX_ID, secret: process.env.DROPBOX_SECRET };
}

function dropbox_oauth(req, res) {
    //express
    //req.query[url_query_param_name]
    //req.headers["content-type"]
    //req.method=="POST"
    //req.body "string" ou "object" depending on content-type

    var oauth_code = req.query.code
    
    // User has accepted authentication. We receive a "code" that can be exchanged for a "access_token"
    var params = {
        "client_id": creds.id,
        "client_secret": creds.secret, 
        "code": oauth_code,  // The code received as a response to OAuth Step 1.
        //"state": "engolirsapos", // The unguessable random string provided in OAuth Step 1.
        "grant_type": "authorization_code",
        "redirect_uri": "https://kljh.herokuapp.com/dropbox-oauth" };

    requestify.request("https://api.dropboxapi.com/oauth2/token", { 
            method: 'POST',
            params: params,
            body: params,
            dataType: 'json', // for body : "json"|"form-url-encoded"|body-served-as-string.
            redirect: true
    })

    .then(function (access_token_response) {
        var oauth_access_body = access_token_response.getBody();
        var oauth_access_data = oauth_access_body.substr ? JSON.parse(oauth_access_body) : oauth_access_body;
        var oauth_access_token = oauth_access_data.access_token;

        if (0) // stop here for debug purpose, other onecarry one with the request for user details
        res.send(JSON.stringify({ "oauth_code": oauth_code, "oauth_access_token": oauth_access_token, 
            "request_query": req.query, "request_body": req.body, 
            "reply_code": access_token_response.getCode(), "reply_body": access_token_response.getBody() }));

        req.session.info = req.session.info || {}
        req.session.info.dropbox_oauth_access_details = {
            oauth_access_token: ""+oauth_access_token,
            oauth_access_body: oauth_access_body };

        // We now have an "access_token",we can use it to query the Dropbox API        
        request_user_details(oauth_access_token, req, res);
    })
    .fail(function (access_token_error) {
        res.send(JSON.stringify({ "error": "failed getting access token from "+oauth_code, "access_token_error": access_token_error }));
    })
}

function request_user_details(oauth_access_token, req, res) {
            
    request({
            url: "https://api.dropboxapi.com/2/users/get_current_account?authorization=Bearer "+oauth_access_token,
            method: "POST",
            body: "",
        }, 
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var user_info = body;
                if (user_info.substr) try { user_info = JSON.parse(user_info) } catch(e) {}
                
                req.session.info = req.session.info || {}
                req.session.info.dropbox_oauth = user_info;
            
                console.log(user_info);
                //res.send(user_info);
                res.redirect('/');
            } else {
                res.send({ error: error, response: response, body: body, oauth_access_token: oauth_access_token});
            }
        }
    );

}

function request_access_token_revoke(oauth_access_token, req, res) {
            
    request({
            url: "https://api.dropboxapi.com/2/auth/token/revoke?authorization=Bearer "+oauth_access_token,
            method: "POST",
            body: "",
        }, 
        function (error, response, body) {
            res.send({ error: error, response: response, body: body, oauth_access_token: oauth_access_token});
        }
    );

}


module.exports = function(app) {
    app.use('/dropbox-oauth', dropbox_oauth);

    app.get('/dropbox-oauth-user', function (req, res) {
        request_user_details(req.query.access_token || creds.access_token, req, res);
    });
    app.get('/dropbox-oauth-revoke', function (req, res) {
        request_access_token_revoke(req.query.access_token || creds.access_token, req, res);
    });
};
