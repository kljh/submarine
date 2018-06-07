const fs = require('fs');

var preamble  =
	"# Input : Dependency graph syntax: \n" + 
	"# 1st line: <number of vertices> <number of stones>\n" +
	"# subsequent lines: <precedent vertex> <successor vertex>\n" +
	"\n";
	"# Output : Execution sequence suntax:" +
	"# <vertex1> [<vertex2>] - put stone in vertex 1 [optional: from vertex 2]\n" +
	"\n";

var test_input_files = [
	"trivial_4v_2r.txt",
	"trivial_shuffled_4v_2r.txt",
	"cache_15v_4r.txt",
	"cache_15v_3r.txt",
	"cache_15v_2r.txt",
	"func_16v_10r.txt",
	"func2_33v_5r.txt",
	"merge_60v_5r.txt", 
	//*
	"random_10v_3r.txt",
	"random_20v_5r.txt",
	"random_75v_15r.txt",
	"random_200v_25r.txt",
	// */
	];

var test_input = test_input_files.map(file => fs.readFileSync('code-contest/regstress/'+file, 'utf8')+"\n");

function get_input_data(previous_steps) {
	var iteration = previous_steps.length
	if (iteration>=test_input.length) 
		return; // return undefined => HTTP status 404 => submission script does not iterate
	
	return preamble + test_input[iteration];
}

function submit_output_data(output_data, previous_steps) {
	return submit_output_data_nothrow(output_data, previous_steps);
}

function submit_output_data_nothrow(output_data, previous_steps) {
	try {
		return submit_output_data_throws(output_data, previous_steps);
	} catch(e) {
		return { completed: 0.01, result: 666, msg: "ERROR: "+e, iterate: true};
	}
}

function read_graph(txt) { 
	var lines = txt.split("\n").filter(line => line!="" && line[0]!="#");
	var tmp = lines.shift().trim().split(" ");
	var nbVertices = 1*tmp[0];
	var nbStones	= 1*tmp[1];
	//console.log("nbVertices", nbVertices, "nbStones", nbStones);
	
	var pred = [], succ = [], label = [];
	for (var i=0; i<nbVertices+1; i++) {
		pred[i] = [];  
		succ[i] = []; 
		label[i] = ""; 
	}
	lines.forEach(line => {
		var tmp = line.trim().split(" ");
		var p = 1*tmp.shift();
		var v = 1*tmp.shift();
		//console.log(nbVertices, p, v)
		pred[v].push(p);
		succ[p].push(v);
		var tmp = tmp.join(" ").trim();
		if (tmp) label[p] = tmp;
	})
	//console.log("pred", pred);
	//console.log("succ", succ);
	return { nbVertices: nbVertices, nbStones: nbStones, pred: pred, succ: succ, label: label };
}

function submit_output_data_throws(output_data, previous_steps) {
	var iteration = previous_steps.length
	var input_data = preamble + test_input[iteration];
	
	// parse input of program
	var input_graph = read_graph(input_data)
	var nbVertices = input_graph.nbVertices;
	var nbStones	= input_graph.nbStones;
	var pred = input_graph.pred, succ = input_graph.succ, state = [];
	for (var i=0; i<nbVertices+1; i++) 
		state[i] = 0;
	
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

// ----------------------------------------------------------------------------

// TEST: submit_output_data(test_output[0], []);
	
// DISPLAY : 

function calc_min_nbstones(pred) {
	var n = pred.length;
	var nb = new Array(n);

	// root vertices 
	for (var i=0; i<n; i++) 
		if (pred[i].length==0) {
			nb[i] =1
			console.log(">", i, " => ", nb[i]);
		}
				
	
	// iterate on child vertices
	var bDone = false;
	while (!bDone) {
		bDone = true;
		for (var i=0; i<n; i++) {
			if (nb[i]) continue; // already done
			
			var minNb = pred[i].reduce((acc, k)=> Math.min(acc, nb[k]));
			var maxNb = pred[i].reduce((acc, k)=> Math.max(acc, nb[k]));
			
			if (minNb && maxNb) {
				// can calculate
				var nbParents = pred[i].length;
				nb[i] = Math.max(maxNb, nbParents-1+minNb);
				console.log(">", i, "nbParents", nbParents, "minNb", minNb, "maxNb", maxNb, " => ", nb[i], "pred[i]", pred[i])
				bDone = false;
			}
		}
	}
	return nb[n-1];
}

function generate_random(n, prms) {
	var succ =  new Array(n+1);
	for (var i=0; i<n+1; i++) {
		succ[i] = [];
	}
	// pick a successor after i
	for (var i=n-1; i>0; i--) {
		var m = n - i;
		var ja = i + 1+ Math.floor(Math.random()*m);
		var b = succ[i].indexOf(ja)==-1; 
		if (b) succ[i].push(ja);
	}
	// pick a predecessor before i
	for (var i=n; i>1; i--) {
		var m = i - 1;
		var jb = 1 + Math.floor(Math.random()*m);
		var b = succ[jb].indexOf(i)==-1; 
		if (b) succ[jb].push(i);
	} 
	return succ;
}
function pred_from_succ(succ) {
	console.log("succ", succ)
	var n = succ.length;
	var pred = new Array(n);
	for (var i=0; i<n; i++) {
		pred[i] = [];
	}
	for (var i=0; i<n; i++) {
		for (var j=0; j<succ[i].length; j++) {
			var s = succ[i][j];
			pred[s].push(i);
		}
	}
	console.log("pred", pred);
	return pred;
}
function generate_file(succ, m) {
	var txt = (succ.length-1) + " " + m + "\n";
	for (var i=0; i<succ.length; i++) {
		var s = succ[i];
		for (var j=0; j<s.length; j++) 
			txt += i + " " + s[j] + "\n";
	}
	return txt;
}
function generate_save_file(n, m) {
	var succ = generate_random(n);
	var pred = pred_from_succ(succ);
	var m_min = calc_min_nbstones(pred);
	
	var txt = generate_file(succ, m_min+m);
	var path = 'regstress/random_'+n+'v_'+m+'r.txt';
	fs.writeFileSync(path, txt, 'utf8');
	console.log(path, m_min);
}
/*
generate_save_file(10, 3);
generate_save_file(20, 5);
generate_save_file(75, 15);
generate_save_file(200, 25);
*/

function generate_dot(txt, file) {
	//console.log(file)
	var graph = read_graph(txt)
	//console.log(graph)
	var dot = "";
	for (var i=0; i<graph.succ.length; i++) 
		dot += graph.succ[i].map(j => i+" -> "+j).join("\n") + "\n";
	
	return "digraph {"
		+ graph.label.map((label, i) => i+" [label=\""+(label||i)+"\"]").join("\n") + "\n"
		+ (graph.nbVertices) +" [shape=box]\n"
		+ dot 
		+ "}"
}
function generate_dots()  {
	for (var i=0; i<test_input_files.length; i++) 
		fs.writeFileSync('regstress/'+test_input_files[i]+".dot", generate_dot(test_input[i], test_input_files[i]), 'utf8');
}
//generate_dots();