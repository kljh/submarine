const cfg = require('./config.json');

// authenticates incoming requests through LDAP.
var ldap_auth;
if ( cfg.ldap_server_url) 
try {

    var ldap = require('ldapjs');
    var ldap_client = ldap.createClient({ url: cfg.ldap_server_url || "ldap://127.0.0.1:1389" });

    ldap_auth = function(user_id, user_pwd, then, fail) {
        // The bind API only allows LDAP 'simple' binds (equivalent to HTTP Basic Authentication) for now.
        var dn = ( cfg.ldap_user_search || "cn=" ) + user_id;
        var password = user_pwd;
        ldap_client.bind(dn, password, function(err) {
            if (err)
                return fail(err);
            
            var ldap_user_opts = { attributes: cfg.ldap_user_attributes }

            ldap_client.search(dn, ldap_user_opts, function(err, res) {
                if (err)
                    return fail(err);
            
                res.on('searchEntry', function(entry) {
                    console.log('LDAP entry: ', entry.object);
                    then(entry.object)
                });
                res.on('searchReference', function(referral) {
                    console.log('LDAP referral: ' + referral.uris.join());
                });
                res.on('error', function(err) {
                    console.error('LDAP error: ' + err.message);
                    fail(err);
                });
                res.on('end', function(result) {
                    console.log('LDAP status: ' + result.status);
                });
            });

        });
    };
} catch(e) {
    console.error("LDAP authentication module not available. Make sure 'ldapjs' is part of package.json.", e);
}

module.exports = ldap_auth;