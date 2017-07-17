const requestify = require('requestify'); 

var creds;
//try { 
//    creds = require('./credentials.json').github; 
//} catch(e) {
    creds = { id: process.env.GITHUB_ID, secret: process.env.GITHUB_SECRET };
//}

function github_oauth(req, res) {
    //express
    //req.query[url_query_param_name]
    //req.headers["content-type"]
    //req.method=="POST"
    //req.body "string" ou "object" depending on content-type

    var oauth_code = req.query.code
    
    // User has accepted authentication through GitHub. We receive a "code" that can be exchanged for a "access_token"
    var params = {
        "client_id": creds.id,
        "client_secret": creds.secret, 
        "code": oauth_code,  // The code received as a response to OAuth Step 1.
        "state": "engolirsapos", // The unguessable random string provided in OAuth Step 1.
        "redirect_uri": "https://kljh.herokuapp.com/github-oauth" };

    requestify.request("https://github.com/login/oauth/access_token", { 
            method: 'POST',
            params: params,
            body: params,
            dataType: 'json', // for body : "json"|"form-url-encoded"|body-served-as-string.
            redirect: true
    })

    .then(function (access_token_response) {
        var oauth_access_token = access_token_response.getBody().access_token;

        if (0) // stop here for debug purpose, other onecarry one with the request for user details
        res.send(JSON.stringify({ "oauth_code": oauth_code, "oauth_access_token": oauth_access_token, 
            "request_query": req.query, "request_body": req.body, 
            "reply_code": access_token_response.getCode(), "reply_body": access_token_response.getBody() }));

        // We now have an "access_token",we can use it to query the GitHub API
        return requestify.get("https://api.github.com/user?access_token="+oauth_access_token, { 
            headers: { "Authorization": "token "+oauth_access_token }
        })
    })
    .fail(function (access_token_error) {
        res.send(JSON.stringify({ "error": "failed getting access token from "+oauth_code, "access_token_error": access_token_error }));
    })

    .then(function (user_info_response) {
        var user_info = user_info_response.getBody()

        req.session.info = req.session.info || {}
        req.session.info.github_oauth = user_info;

        //res.send(JSON.stringify(user_info)); 
        res.redirect('/');
    })
    .fail(function (user_info_error) {
        res.send(JSON.stringify({ "error": "failed getting user info", "user_info_error": user_info_error }));
    });
    
}

module.exports = function(app) {
    app.use('/github-oauth', github_oauth);
};