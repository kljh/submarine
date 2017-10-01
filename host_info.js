

function host_info_plain(request) {
    return {
        version: 0.2,
        username: process.env.USERNAME, 
        hostname: process.env.COMPUTERNAME,
        nb_cpu: process.env.NUMBER_OF_PROCESSORS
    }
}


function host_info_promise(request) {
    return new Promise(function (resolve, reject) {
        resolve( {
            version: 0.2,
            username: process.env.USERNAME, 
            hostname: process.env.COMPUTERNAME,
            nb_cpu: process.env.NUMBER_OF_PROCESSORS
        });
    });
}

async function host_info_async(request) {
	var tmp = await host_info_promise(request);
	var tmpx = await global_vars.xl_rpc_promise("XlSet", "abc", 456);
	tmp.x = tmpx;
	return tmp;
}

var host_info = host_info_async;

//host_info_promise().then(console.log);
//host_info_async().then(console.log);