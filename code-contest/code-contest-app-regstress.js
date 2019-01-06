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
	"random_10v_10r.txt",
	"random_10v_3r.txt",
	"random_15v_5r.txt",
	"random_15v_2r.txt",
	"random_15v_0r.txt",
	"func_16v_8r.txt",
	"func_16v_6r.txt",
	"func_16v_4r.txt",
	"random_20v_5r.txt",
	"random_20v_2r.txt",
	"random_20v_0r.txt",
	"random_25v_5r.txt",
	"random_25v_0r.txt",
	"random_30v_3r.txt",
	"random_40v_3r.txt",
	"random_50v_5r.txt",
	"merge_60v_5r.txt",
	"random_75v_10r.txt",
	"random_125v_10r.txt",
	"random_200v_10r.txt"
	];

try{
var test_input = test_input_files.map(file => fs.readFileSync('code-contest/regstress/'+file, 'utf8')+"\n");
} catch (e) {}

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
	submit_output_data: submit_output_data,
	read_graph: read_graph,
	calc_min_nbstones: calc_min_nbstones,
	};

// ----------------------------------------------------------------------------

// TEST: submit_output_data(test_output[0], []);

// DISPLAY :

function calc_min_nbstones(pred, return_full_costs) {
	var n = pred.length;
	var nb = new Array(n);

	var bDisp = n<5;
	if (bDisp) console.log("pred", pred);

	// root vertices
	for (var i=0; i<n; i++)
		if (pred[i].length==0) {
			nb[i] =1
			if (bDisp) console.log(">", i, " => ", nb[i]);
		}


	// iterate on child vertices
	var bDone = false;
	while (!bDone) {
		bDone = true;
		for (var i=0; i<n; i++) {
			if (nb[i]) continue; // already done

			var minNb = pred[i].reduce((acc, k)=> Math.min(acc, nb[k]), n);
			var maxNb = pred[i].reduce((acc, k)=> Math.max(acc, nb[k]), 0);

			if (minNb && maxNb) {
				// can calculate
				var nbParents = pred[i].length;
				nb[i] = Math.max(maxNb, nbParents-1+minNb);
				if (bDisp) console.log(">", i, "nbParents", nbParents, "minNb", minNb, "maxNb", maxNb, " => ", nb[i], "pred[i]", pred[i])
				bDone = false;
			}
		}
	}
	if (return_full_costs)
		return nb;
	return nb[n-1];
}

function generate_random(n, prms) {
	var succ =  new Array(n+1);
	for (var i=0; i<n+1; i++) {
		succ[i] = [];
	}
	// a pivot node in the middle
	var p = Math.floor(n*(0.3 + 0.4*Math.random()));
	var pprob = Math.max(0.1, Math.min(7/n, 0.4));
	console.log("pivot", p, n);
	for (var i=1; i<n-1; i++) {
		if (Math.random()<pprob) {
			if (i<p)  succ[i].push(p);
			if (p<i)  succ[p].push(i);
		}
	}
	// pick a successor after i
	for (var i=n-1; i>0; i--) {
		var m = Math.min(n - i, Math.random()<0.75?5:n); // try to keep some locality
		var ja = i + 1+ Math.floor(Math.random()*m);
		var b = succ[i].indexOf(ja)==-1;
		if (b) succ[i].push(ja);
	}
	// pick a predecessor before i
	for (var i=n; i>1; i--) {
		var m = Math.min(i - 1, Math.random()<0.75?5:n); // try use more first nodes
		var jb = 1 + Math.floor(Math.random()*m);
		var b = succ[jb].indexOf(i)==-1;
		if (b) succ[jb].push(i);
	}
	return succ;
}
function pred_from_succ(succ) {
	//console.log("succ", succ)
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
	//console.log("pred", pred);
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
	test_input_files.push(path.split('/').pop());
	console.log(path, m_min);
}


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
	var test_input = test_input_files.map(file => fs.readFileSync('regstress/'+file, 'utf8')+"\n");
	for (var i=0; i<test_input_files.length; i++) {
		fs.writeFileSync('regstress/'+test_input_files[i]+".dot", generate_dot(test_input[i], test_input_files[i]), 'utf8');
	}
}
function generate_all() {
	generate_save_file(10, 10);
	generate_save_file(10, 3);
	generate_save_file(15, 5);
	generate_save_file(15, 2);
	generate_save_file(15, 0);
	generate_save_file(20, 5);
	generate_save_file(20, 2);
	generate_save_file(20, 0);
	generate_save_file(25, 5);
	generate_save_file(25, 0);
	generate_save_file(30, 3);
	generate_save_file(40, 3);
	generate_save_file(50, 5);
	generate_save_file(75, 10);
	generate_save_file(125, 10);
	generate_save_file(200, 10);
	generate_dots();
	console.log(JSON.stringify(test_input_files, null, 4));
}
//generate_all();