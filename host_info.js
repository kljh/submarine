'use strict';

function host_info_plain(request, session_id) {
    return {
        version: 0.2,
        username: process.env.USERNAME, 
        hostname: process.env.COMPUTERNAME,
        nb_cpu: process.env.NUMBER_OF_PROCESSORS
    }
}


function host_info_promise(request, session_id) {
    return new Promise(function (resolve, reject) {
        resolve( { 
            version: 0.2,
            username: process.env.USERNAME, 
            hostname: process.env.COMPUTERNAME,
            nb_cpu: process.env.NUMBER_OF_PROCESSORS
        });
    });
}

async function host_info_async(request, session_id) {
    var tmp = await host_info_promise(request, session_id);
    
    // call back to Excel (manually)
	try {
        var tmpxs = top_left(await global_vars.xl_rpc_promise(session_id, "XlSet", "abc", 456));
	    tmp.xs = tmpxs;
    } catch(e) {
        console.error("error XlSet abc", e.message||e);
        tmp.xserr = e.message;
        tmp.xsstack = e.stack;
    }
    
    // call back to Excel (creating stub as needed, ONCE for all)
    console.log("stub inverse...")
    var XlInverse = await global_vars.xl_rpc_stub("XlInverse", session_id);
    try {
        console.log("invoke inverse...")
        tmp.xi = await XlInverse([[1,2],[13,17]]);
    } catch(e) {
        console.error("error inverse", e.message);
        tmp.xierr = e.message;
        tmp.xistack = e.stack;
    }
    
    // call back to Excel (creating all stub at once)
    var xl = await global_vars.xl_rpc_stubs(session_id);
    try {
        tmp.xl = Object.keys(xl).length + " functions exported";
        tmp.z = await xl.XlSet("def", 789);
    } catch(e) {
        tmp.zerr = e.message;
        tmp.zstack = e.stack;
    }

    return tmp;
}

var host_info = host_info_async;

//host_info_promise().then(console.log);
//host_info_async().then(console.log);