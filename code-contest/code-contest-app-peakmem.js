


function get_input_data(previous_steps) {
	var iteration = previous_steps.length
	console.log("problem iteration", iteration);

	if (iteration>=test_input.length)
		return; // return undefined => HTTP status 404 => submission script does not iterate

	return test_input[iteration];
}


function submit_output_data(output_data, previous_steps) {
	var iteration = previous_steps.length;
	console.log("solution iteration", iteration);

	var txt = test_input[iteration];
	// console.log("problem raw", txt);
	var grph = parse_problem(txt);
	// console.log("problem grph", grph);

	console.log("user raw solution", output_data)
	var seq = parse_solution(output_data);
	console.log("user parsed solution", seq)
	var res = check_solution_nothrow(grph, seq);
	console.log("solution status", res)

	if (res.error) {
		var ret ={ completed: 0.5, msg: "Error validating solution. " + res.error, result: 1e8, iterate: true };
	} else {
		var completed = 0.5;
		var result = res.score;
		var msg = "this solution uses "+Math.round(res.pct_of_max_footprint*100)+"% of resources needed by naive approach.";
		var ret = { completed, msg, result, iterate: true};
	}
	console.log(ret);
	return ret;
}


module.exports = {
	get_input_data: get_input_data,
	submit_output_data: submit_output_data
	};


// ----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const readline = require('readline');

var test_folder = path.join(__dirname, "peakmem")
var test_input = fs.readdirSync(test_folder)
.filter(file => {
	return file.split(".").pop()=="txt";
})
.map(file => {
	var n = file.substr(0, file.length-3).split("_").pop()*1;
	return [ n, file ];
})
.sort((a, b) => a[0]-b[0])
.map(x => fs.readFileSync(path.join(test_folder, x[1]), { encoding: "latin1" }));

function parse_problem(txt) {
	var footprints = [];
	var sources = [];
	var sinks = [];

	var rows = txt.split("\n");
	var n = rows.shift()*1;
	for (var i=0; i<n; i++) {
		var tmp = rows[i].split(/\s/).filter(x => x!='')
		var footprint = tmp.shift()*1
		var args = tmp.map(x => x*1)

		footprints.push(footprint)
		sources.push(args)
		for (var j=0; j<args.length; j++) {
			var a = args[j];
			sinks[a] = sinks[a] || []
			sinks[a].push(i);
		}
	}

	return { footprints, sources, sinks };
}

function parse_solution(txt) {
	var solution = [];

	var rows = txt.split("\n");
	var n = rows.shift()*1;
	if (rows.length<n)
		throw new Error("declaring "+n+"rows but actually only sending "+rows.length+" rows.")
	for (var i=0; i<n; i++) {
		var tmp = rows[i].split(/\s/).filter(x => x!='')
		var execute = tmp.shift()*1
		var release = tmp.map(x => x*1)
		solution.push({ execute, release })
	}

	return solution;
}

function naive_solution(grph) {
	var sources = grph.sources;
	var sinks = grph.sinks;
	var nb_exprs = sources.length;

	var txt = nb_exprs + "\n";

	var done = new Array(nb_exprs).fill(false);
	var nb_remaining_sinks = sinks.map(sink => sink.length);

	for (var it=0; it<nb_exprs; it++) {
		var still_working = false;

		for (var i=0; i<nb_exprs; i++) {
			if (done[i]) continue;
			still_working = true;

			var args = sources[i]
			var args_ok = true;
			for (var j=0; j<args.length; j++) {
				var a = args[j];
				if (!done[a]) { args_ok = false; break; }
			}

			if (args_ok) {
				to_release = [];
				for (var j=0; j<args.length; j++) {
					var a = args[j];
					nb_remaining_sinks[a]--;
					if (nb_remaining_sinks[a]==0)
						to_release.push(a);
				}


				if (true || Math.random()<0.95) {
					// normal answer
					txt += i + " " + to_release.join(" ") + "\n";
				} else {
					// simulating errors
					z = Math.random()
					if (z<0.4)
						// too many release
						txt += i + " " + to_release.join(" ") + " " + to_release.join(" ") + "\n";
					else if (z<0.6)
						// release random
						txt += i + " " + (nb_exprs-1) + "\n";
					else
						// executing random
						txt += (nb_exprs-1) + "\n";
				}
				done[i] = true
			}
		}

		if (!still_working) break;
	}
	if (still_working) throw "circular deps";

	return txt;
}

function check_solution_nothrow(grph, seq) {
	try {
		return check_solution(grph, seq);
	} catch (e) {
		return { error: ""+e };
	}
}

function check_solution(grph, seq) {

	var footprints = grph.footprints;
	var sources = grph.sources;
	var nb_exprs = footprints.length;
	var nb_execs = seq.length;

	var executed = new Array(nb_exprs).fill(false);
	var released = new Array(nb_exprs).fill(false);

	var cumul_footprint = 0;
	var peak_footprint = 0;
	var nb_variables_in_use = 0;
	var sum_nb_variables_in_use = 0;

	for (var ix=0; ix<nb_execs; ix++) {
		var idx = seq[ix].execute

		// check args have already been evaluated
		var args = sources[idx]
		for (var j=0; j<args.length; j++) {
			var a = args[j];
			if (!executed[a] || released[a])
				throw "Expression "+idx+" (at position "+ix+") can't be evaluated (expression "+a+" not yet evaluated).";
		}
		executed[idx] = true

		// updating footprint
		cumul_footprint += footprints[idx];
		peak_footprint = Math.max(peak_footprint, cumul_footprint)
		nb_variables_in_use++;
		sum_nb_variables_in_use += nb_variables_in_use;

		// releasing
		var release_indices = seq[ix].release
		for (var j=0; j<release_indices.length; j++) {
			var r = release_indices[j]
			if (!executed[r])
				throw "At position "+ix+", expression "+r+" 's result can't be released (it hasn't been evaluated yet).";
			if (released[r])
				throw "At position "+ix+", expression "+r+" 's result has already been released (it can't be released again).";

			nb_variables_in_use--;
			cumul_footprint -= footprints[r];
			released[r] = true;
		}
	}
	avg_nb_variables_in_use = sum_nb_variables_in_use / nb_execs;
	avg_nb_variables_in_use = avg_nb_variables_in_use.toFixed(2) * 1;

	// check all expressions have been evaluated
	var not_evaluated = []
	for (var i=0; i<nb_exprs; i++) if (!executed[i]) not_evaluated.push(i);
	if (not_evaluated.length>0)
		throw "Expressions not evaluated: "+not_evaluated.join(",")+".";

	var max_footprint = footprints.reduce((pv, cv) => pv + cv, 0);
	var pct_of_max_footprint = peak_footprint / max_footprint;
	var score = 1.0 - pct_of_max_footprint;
	return { score, pct_of_max_footprint, peak_footprint, avg_nb_variables_in_use }
}

function test() {
	var fs = require('fs')
	var path = require('path')
	var dir = "D:\\Builds\\FIRSTOPEN\\AlteryxToPython\\Alteryx\\bin\\RuntimeData\\Macros"
	var dir = "peakmem";

	var files = fs.readdirSync(dir)
	files.forEach(function(file) {
		if (file.split('.').pop()!="txt") return;
		//console.log(file)
		var filepath = path.join(dir, file);
		var txt = fs.readFileSync(filepath, { encoding: "latin1" })
		var grph = parse_problem(txt);
		//console.log("grph", grph)
		var txt = naive_solution(grph)
		//console.log("solution", txt)
		var seq = parse_solution(txt);
		//console.log("solution", seq)
		var res = check_solution_nothrow(grph, seq);

		render_solution_graph(filepath, grph, seq);
		console.log(file, res)
	});
}

function render_solution_graph(filepath, grph, seq) {
	console.log(grph)
	console.log(seq)
	var txt = "";
	var nbNodes = grph.footprints.length;

	var max_size = grph.footprints.reduce((acc, val) => Math.max(acc, val), 1.0);

	for (var i=0; i<nbNodes; i++) {
		var size = 3 + Math.log(grph.footprints[i] / max_size);
		txt += "  " + i + " [ label= \"#"+i+"\", width=\""+size+"\", height=\""+size+"\" ]\n";

		var dest = i;
		var sources = grph.sources[i]
		for (var source of sources)
			txt += "  " + dest + " -> " + source + "\n";
	}

	txt = "digraph G {\n" + txt + "}\n";

	fs.writeFileSync(filepath+".ditto", txt, { encoding: "latin1" });
}

function proposed_solution() {
	var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var txt = fs.readFileSync(input_data_file,{ "encoding" : "latin1" });
	// console.log(txt);

	var grph = parse_problem(txt);
	// console.log(grph);
	var txt = naive_solution(grph);
	console.log(txt);
}

if (require.main === module) {
	if (process.argv.length>2) proposed_solution();
	else test();
} else {
	console.log("#test_input", test_input.length);
}