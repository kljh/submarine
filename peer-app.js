var diff_match_patch = require('./diff_match_patch_uncompressed.js')
var dmp = new diff_match_patch.diff_match_patch();

function peer_install(app) {

    app.use('/peer/tick', function (req, res) {
        var prms = req.method=="GET" ? req.query : req.body;
        new Promise(async function (resolve, reject) {
            try {
                resolve(await peer_tick(prms));
            } catch(e) {
                console.error(e);
                reject(e);
            }
        })
        .then(function(data) { if (typeof data == "object") res.json(data); else res.send(data); })
        .catch(function(err) { res.status(500).send({ error: err }); })
    });
}

var texts = {}
async function peer_tick(prms) {
    var uid = prms.uid;
    var txt = texts[uid] || "";

    if (prms.p) {
        console.log("peer_tick", prms);
        var patches = dmp.patch_fromText(prms.p);
        var tmp = dmp.patch_apply(patches, txt);
        var ok = tmp[1].reduce((acc, cur) => acc && cur, true);
        txt = tmp[0];

        texts[uid] = txt;

        console.log("peer_tick: merge ok", ok, "uid", uid, "txt", JSON.stringify(txt).substr(0,20));
    }

    var h = 0;
    for (var i=0; i<txt.length; i++)
        h = ( h + (h>>1||1)*txt.charCodeAt(i) ) % 0xFFFF;

    var send_full_text = (!prms.h) || (h!=prms.h);
    if (send_full_text)
        console.log("peer_tick: send full text", "uid", uid, "hash server/client", h, prms.h, "txt", JSON.stringify(txt).substr(0,20));

    return { uid, h, t: send_full_text ? txt : undefined };

}


module.exports = {
    install: peer_install
};