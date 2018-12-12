
function get_input_data(previous_steps, attempt_state) {
	var nb_iterations = previous_steps.length
	if (nb_iterations>5)
		return;

	attempt_state.prices = random_walk(25 * 2<<(nb_iterations*2));

	return "# Number of prices\n"
		+ attempt_state.prices.length + "\n\n";
		+ "# Prices of the day (possibly split on multiple lines)\n"
		+ attempt_state.prices.join(" ") + "\n";
}

function submit_output_data(output_data, previous_steps, attempt_state) {
	// parse output of program
	var lines = output_data.split("\n").filter(line => line!="" && line[0]!="#");
	var data = lines[0].split(" ").filter(x => x.trim()!="").map(x => x*1);
	var i0 = data[0];
	var i1 = data[1];

	if (i1<i0) {
		return { completed: 0, result: 0, msg: "Constraint error: you must buy before selling.", iterate: false };

	}
	var sol = solution(attempt_state.prices)
	var sol_i0 = sol[0];
	var sol_i1 = sol[1];

	var success = i0==sol_i0 && i1==sol_i1
	if (success) {
		return { result: 1, msg: "Well Done", iterate: true };
	} else {
		msg = "your solution: i0="+i0+" i1="+i1+", "
			+ "expected solution: i0="+sol_i0+" i1="+sol_i1;
		return { completed: 0, result: 0, msg: msg, iterate: false };
	}
}

function random_walk(n) {
	var vec = new Array(n);
	var val = 65.43;
	var drift = 0.01;

    for (var i=0; i<n; i++) {
        vec[i] = val;
        val = val + drift + Math.random()*2;
    }
    return vec;
}

function solution(vec) {
	var i0=0, i1=0, diff=0.0;

	var n = vec.length;
	var min_so_far = vec[0];
	var min_index = 0;
	for (var i=0; i<n; i++) {
		if ((vec[i]-min_so_far)>diff) {
			// improved PnL
			diff = vec[i] - min_so_far;
			i0 = min_index;
			i1 = i;
		}
		if (vec[i]<min_so_far) {
			// improved min
			min_so_far = vec[i]
		}
	}
	return [ i0, i1 ];
}

module.exports = {
	get_input_data: get_input_data,
	submit_output_data: submit_output_data,
	};

// ----------------------------------------------------------------------------

function proposed_solution() {
	var fs = require('fs');
    var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').map(line => line.trim()).filter(line => line && line[0]!='#');
	var n = 1*input_data.shift();

	var vec = input_data.shift().split(' ').map(val => val.trim()).filter(val => !!val).map(val => val*1);
	var sol = solution(vec);
	var [ i0, i1 ] = sol;
	console.log("# Buy time, sell time\n"+i0+" "+i1+"\n");

}

if (typeof require != "undefined" && require.main === module) {

    if (process.argv.length>2)
		proposed_solution();
	else
		console.log(solution(random_walk(20)));
}