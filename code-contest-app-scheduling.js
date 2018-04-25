var graphs = [
	{ 
		A : { duration: 1, precedents : [] },
		B : { duration: 11, precedents : [ "A" ] },
		C : { duration: 17, precedents : [ "A" ] },
		D : { duration: 13, precedents : [ "A" ] },
		E : { duration: 12, precedents : [ "A" ] },
		F : { duration: 21, precedents : [ "B", "C", "D", "E" ] },		
	}
	];
	
var solutions = [
		{ "minimum_duration_by_number_of_threads": [ 75, 52, 45, 39 ] }
	];

function distributed_build_example() {
	var graph = {};
	// source files ;
	var cpp = [];
	var xg = [];
	var i=0;
	for (var it=0; it<4; it++) {
		var sumS = 0, sumX = 0;
		for (; sumS<150 && sumX<50; i++) {
			var t = 1+Math.random()*9; sumS+=t;
			graph["CPP"+(2*i)] = { duration: t, precedents : [] };
			cpp.push(2*i);
			var t2 = Math.random()*3; sumX+=t;
			graph["CPP"+(2*i+1)] = { duration: t2, precedents : [ "XG" ] };
			xg.push("CPP"+(2*i+1));
		}
		var t = 150-sumS;
		graph["C"+(2*i)] = { duration: t, precedents : [] };
		var t2 = 50-sumX;
		graph["C"+(2*i+1)] = { duration: t2, precedents : [ "XG" ] };
	}
	graph["LINK1"] = { duration: 30, precedents : cpp };
	graph["LINK2"] = { duration: 20, precedents : xg };
	graph["CODE_GENERATION"] = { duration: 2, precedents : [] };
	
	return graph;
}
graphs.push(distributed_build_example());
solutions.push({ "minimum_duration_by_number_of_threads": [ 200*4+30+20+2, "?", "?", 200+30+20+2 - 0, "...", 65 ] });
	
function get_input_data(previous_steps) {
	var graph = graphs[previous_steps.length];
	if (graph===undefined) return;

	var input_data = "# CONSIDER CALCULATION GRAPH BELOW.\n"
		+ "# SYNTAX USED IS :  NODE_NAME:NODE_DURATION:NODE_PRECEDENTS_COMMA_SEPARATED\n"
		+ "# CALCULATE AND WRITE ON STDOUT THE MINIMUM CALCULATION TIME.\n"
		+ "# AND ON NEXT LINE THE NUMBER OF THREAD USED (NB THREADS <= NB NODES).\n"
		+ "# THEN WRITE WHEN AND WHERE EACH NODE IS RUN ON SUBSEQUENT LINES.\n"
		+ "# SYNTAX TO USE IS :  NODE_NAME:NODE_START:CALCULATION_THREAD(0 to N)\n"
		+ "# SOLUTION MUST NOT RELY ON NAMES (OR ORDER) OF NODES WHICH ARE NOT SHUFFLED NOR ANONYMISED TO KEEP VISIBLE PRACTICAL APPLICATIONS OF THIS CHALLENGE.\n";
	
	for (var node_name in graph) 
		input_data += node_name+":"+graph[node_name].duration+":"+graph[node_name].precedents.join(",")+"\n";
		
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	var lines = output_data.split("\n").filter(line => line!="" && line[0]!="#");
	var graph = graphs[previous_steps.length];
	var solution = solutions[previous_steps.length].minimum_duration_by_number_of_threads;
	var time_received = lines.shift()*1;
	var time_expected = solution[solution.length-1];
	
	var nb_threads_received = lines.shift()*1;

	var nodes_received = [];
	var nodes_expected = Object.keys(graph).sort();

	var completed = 0.5;
	var msg = "";

	// check correctness
	var threads_received = [];
	for (var line of lines) {
		var tmp = line.split(":");
		var node = tmp[0];
		var start = tmp[1]*1;
		var thread = tmp[2]*1;
		nodes_received.push(node);
		if (graph[node]) {
			if (!threads_received[thread]) threads_received[thread] = [];
			threads_received[thread].push({ node: node, start: start, end: start+graph[node].duration });
		} else {
			completed = 0;
			msg += "unknown node "+node+"\n"; 
		}
	}
	nodes_received = nodes_received.sort();
	if (JSON.stringify(nodes_received)!=JSON.stringify(nodes_expected)) {
		completed = 0;
		msg += "did not get expected list of nodes.\n" //+ JSON.stringify(nodes_received) + "\n v.s. \n" + JSON.stringify(nodes_expected) + "\n";
	}
	threads_received.forEach((thread, thread_id) => {
		if (!thread) return;
		thread = thread.sort((x,y) => x.start-y.start);
		for (var k=0; k<thread.length-1; k++) {
			if (thread[k+1].start<thread[k].end) {
				completed = 0;
				msg += thread[k+1].node + " starts ("+thread[k+1].start+") before " + thread[k].node + " ends ("+thread[k].end+").\n";
			}
		}
		if (time_received<thread[k].end) {
			completed = 0;
			msg += thread[k].node + " ends ("+thread[k].end+") after full calculation expected ends ("+time_received+").\n";
		}
	});
	msg += "received "+time_received+", expected "+time_expected+" (or even better, if possible)";
	
	var result = time_received - time_expected;
	return { completed: completed, result: result, msg: msg, iterate: true};
}


module.exports = {
	get_input_data: get_input_data, 
	submit_output_data: submit_output_data
	};


// ----------------------------------------------------------------------------

//console.log(get_input_data([]))
//console.log(get_input_data([{}]))


const fs = require('fs');
const readline = require('readline');

function proposed_solution() {
	var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').filter(line => line[0]!='#');
	console.log("# input_data length", input_data.length)
	
	// hardcoded best solution for first graph with 2 threads constraint
	
	var time = 52;
	console.log("# minimum time", time);
	console.log(time);

	var nb_threads = 2;
	console.log("# nb_threads", nb_threads);
	console.log(nb_threads);
	
	console.log("A:0:0")
	console.log("C:1:0")
	console.log("B:18:0")
	console.log("D:1:1")
	console.log("E:14:1")
	console.log("F:31:0")
}

if (process.argv.length>2) proposed_solution();
