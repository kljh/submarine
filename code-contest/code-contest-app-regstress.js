
var test_data = [
	{ 
		input:
			"# Input : Dependency graph syntax: \n" + 
			"# 1st line: <number of vertices> <number of stones>\n" + 		" \n" +
			"# subsequent lines: <precedent vertex> <successor vertex>\n" + 
			"10 3 \n" +
			"1 2 \n" +
			"1 6 \n" +
			"1 8 \n" +
			"2 3 \n" +
			"6 7 \n" +
			"8 7 \n" +
			"8 9 \n" +
			"9 10 \n" +
			"3 4 \n" +
			"4 5 \n" +
			"7 5 \n" +
			"10 4 \n" +
			"\n" +
			"# Output : Execution sequence suntax:" +
			"# <vertex1> [<vertex2>] - put stone in vertex 1 [optional: from vertex 2]\n" +
			"\n",
		output:  
			"# Solution: \n" +
			"1\n" +
			"2\n" +
			"6\n" +
			"8 1\n" +
			"3 2\n" +
			"7 6\n" +
			"9 8\n" +
			"10 9\n" +
			"4 10 \n" +
			"5 7\n" +
			"\n"
	}];

function get_input_data(previous_steps) {
	var iteration = previous_steps.length
	if (iteration>=test_data.length) 
		return; // return undefined => HTTP status 404 => submission script does not iterate
	
	return test_data[iteration].input;
}

function submit_output_data(output_data, previous_steps) {
	var iteration = previous_steps.length
	var input_data = test_data[iteration].input;
	
	// parse input of program
	var lines = input_data.split("\n").filter(line => line!="" && line[0]!="#");
	var tmp = lines.shift().trim().split(" ");
	var tmp = lines.shift().trim().split(" ");
	var nbVertices = 1*tmp[0];
	var nbStones	= 1*tmp[1];
	console.log("nbVertices", nbVertices, "nbStones", nbStones);
	
	var pred = [], succ = [], state = [];
	for (var i=0; i<nbVertices+1; i++) {
		state[i] = 0;
		pred[i] = [];  
		succ[i] = []; 
	}
	lines.forEach(line => {
		var tmp = line.trim().split(" ");
		var p = 1*tmp[0];
		var v = 1*tmp[1];
		pred[v].push(p);
		succ[p].push(v);
	})
	console.log("pred", pred);
	console.log("succ", succ);
	
	// parse output of program
	var lines = output_data.split("\n").filter(line => line!="" && line[0]!="#");
	lines.forEach((line, idx) => {
		var tmp = line.trim().split(" ");
		var v = 1*tmp[0];
		pred[v].forEach(p => {
			if (!state[p])  throw new Error("can't put stone in "+v+": no stone in predecessor "+p+" at step "+idx+". "+line);
		});
		//if (state[v])  throw new Error("already a stone in "+v+" at step "+idx+". "+line);
		if (tmp.length==1) {
			// putting a new stone
			if (nbStones==0)  throw new Error("no more stones at step "+idx+". "+line);
			state[v]++ ;
			nbStones--
		} else {
			// moving a new stone
			var vold = 1*tmp[1];
			if (!state[vold])  throw new Error("no stone to move from "+vold+" to "+v+" at step "+idx+". "+line);
			state[v]++ ;
			state[vold]-- ;
		}
		console.log("state", state, "   ", line);
	});
	if (!state[nbVertices]) throw new Error("no stone in last vertices ("+(nbVertices)+") after final step.");
	
	var result = lines.length;
	var completed = 0.5; // to do
	var msg = completed==1 ? "well done" : "can do better?";
	
	return { completed: completed, result: result, msg: msg, iterate: true};
}

module.exports = {
	get_input_data: get_input_data, 
	submit_output_data: submit_output_data
	};

// TEST: submit_output_data(test_data[0].output, []);
	
// ----------------------------------------------------------------------------

const fs = require('fs');
const readline = require('readline');

//if (process.argv.length>2) proposed_solution();
