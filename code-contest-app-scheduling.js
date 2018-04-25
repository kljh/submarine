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
		+ "# WRITE WHEN AND WHERE EACH NODE IS RUN ON SUBSEQUENT LINES.\n"
		+ "# SYNTAX TO USE IS :  NODE_NAME:NODE_START:CALCULATION_THREAD(0 to N)\n"
		+ "# SOLUTION MUST NOT RELY ON NAMES (OR ORDER) OF NODES WHICH ARE NOT SHUFFLED NOR ANONYMISED TO KEEP VISIBLE PRACTICAL APPLICATIONS OF THIS CHALLENGE.\n";
	
	for (var node_name in graph) 
		input_data += node_name+":"+graph[node_name].duration+":"+graph[node_name].precedents.join(",")+"\n";
		
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	var lines = output_data.split("\n").filter(line => line[0]!="#");
	var solution = solutions[previous_steps.length].minimum_duration_by_number_of_threads;
	var time_received = lines[0]*1;
	var time_expected = solution[solution.length-1];
	
	var correct = true; // TO DO 
	
	var completed = correct ? 0.5 : 0;
	var msg = "received "+time_received+", expected "+time_expected+" (or even better, if possible)";
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
	
	var time = 999;
	console.log("# minimum time", time)
	
	console.log(time);
}

if (process.argv.length>2) proposed_solution();
