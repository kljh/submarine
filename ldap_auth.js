'use strict';

const cfg = require('./config.json');

// authenticates incoming requests through LDAP.
var ldap_auth;
if ( cfg.ldap_server_url ) 
try {

const ldap = require('ldapjs');
const ldap_client = ldap.createClient({ url: cfg.ldap_server_url || "ldap://127.0.0.1:1389" });

ldap_auth = function(user_id, user_pwd) {

    return new Promise(function (resolve, reject) {

        // The bind API only allows LDAP 'simple' binds (equivalent to HTTP Basic Authentication) for now.
        var dn = ( cfg.ldap_user_search || "cn=$(user_id)" ).replace("$(user_id)", user_id);
        var password = user_pwd;
        ldap_client.bind(dn, password, function(err) {
            if (err) {
                console.error("LDAP bind err: ", err);
                return reject(err);
            }
            
            var ldap_user_opts = { attributes: cfg.ldap_user_attributes }

            ldap_client.search(dn, ldap_user_opts, function(err, res) {
                if (err) {
                    console.error("LDAP bind err: ", err);
                    return reject(err);
                }
                
                var entries = [];
                var referrals = [];
                res.on('searchEntry', function(entry) {
                    console.log('LDAP entry: ', entry.object);
                    entries.push(entry.object);
                });
                res.on('searchReference', function(referral) {
                    console.log('LDAP referral: ' + referral.uris.join());
                    referrals.push(referral.uris);
                });
                res.on('error', function(err) {
                    console.error('LDAP error: ' + err.message);
                    reject(err);
                });
                res.on('end', function(result) {
                    console.log('LDAP status: ' + result.status);
                    
                    // resolve when the search finds exactly one match
                    if (entries.length==1 && referrals.length==0)
                        resolve(entries[0])
                    else 
                        reject({ error: "LDAP search on UID: expecting exactly one match", entries: entries, referrals: referrals });
                });
            });

        });
    });
};
    
} catch(e) {
    console.error("LDAP authentication module not available. Make sure 'ldapjs' is part of package.json.", e);
}

module.exports = ldap_auth;