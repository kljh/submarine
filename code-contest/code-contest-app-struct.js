var test_cases = [
  { struct: '# Lines starting with \'#\' are ignored\n# Blank lines are ignored\n\n# Number of vertices, elements, Unknown external faorces, Know external forces\n4 5 3 1 \n\n# Vertices coordinates\n0 0\n1 0\n1 1\n2 1\n\n# Elements (beam or cable) : vertices id (id is the position in the list above, starting with index 0) at both end\n0 1\n0 2\n1 2\n1 3\n2 3\n\n# Unknow external forces  (anchoring of the structure to the ground) : vertices id and direction (unit norm)\n0  1 0\n0  0 1\n1  0 1\n\n# Known external forces  (load applied to the structure) : vertices id and direction (norm of vector proportionnal to the load)\n3  0 -0.3\n',
    forces: '# Expected output: \n# tension in each element (beam or cable, positive value for traction, negative value for compression)\n# and force in anchoring links (positive along the provided direction, negative if in the oppositie direction)\n# one value per line\n-0.3\n0.4242640687119285\n-0.3\n-0.4242640687119285\n0.3\n0\n-0.3\n0.6\n' },
  { struct: '# Lines starting with \'#\' are ignored\n# Blank lines are ignored\n\n# Number of vertices, elements, Unknown external faorces, Know external forces\n11 19 3 1 \n\n# Vertices coordinates\n0 10\n-6 10\n-6 8.5\n-12 8.5\n-18 10\n-24 8.5\n-30 10\n-12 7\n-18 5.5\n-18 4\n-24 0.25\n\n# Elements (beam or cable) : vertices id (id is the position in the list above, starting with index 0) at both end\n0 1\n0 2\n1 2\n1 3\n2 3\n1 4\n3 4\n4 5\n4 6\n5 6\n2 7\n3 7\n3 8\n7 8\n7 9\n8 9\n8 10\n9 10\n5 10\n\n# Unknow external forces  (anchoring of the structure to the ground) : vertices id and direction (unit norm)\n10  1 0\n10  0 1\n0  0 1\n\n# Known external forces  (load applied to the structure) : vertices id and direction (norm of vector proportionnal to the load)\n7  0 -2\n',
    forces: '# Expected output: \n# tension in each element (beam or cable, positive value for traction, negative value for compression)\n# and force in anchoring links (positive along the provided direction, negative if in the oppositie direction)\n# one value per line\n-4\n4.123105625617661\n1\n-4.123105625617661\n-4\n0\n0\n0\n0\n0\n8.246211251235321\n3\n-8.94427190999916\n4.12310562561766\n4.47213595499958\n0.5000000000000001\n-5.315072906367325\n4.716990566028302\n0\n0\n0.9999999999999997\n1\n' },
  { struct: '# Lines starting with \'#\' are ignored\n# Blank lines are ignored\n\n# Number of vertices, elements, Unknown external faorces, Know external forces\n21 39 3 1 \n\n# Vertices coordinates\n0 10\n-6 10\n-6 8.5\n-12 8.5\n-18 10\n-24 8.5\n-30 10\n-12 7\n-18 5.5\n-18 4\n-24 0.25\n6 10\n6 8.5\n12 8.5\n18 10\n24 8.5\n30 10\n12 7\n18 5.5\n18 4\n24 0.25\n\n# Elements (beam or cable) : vertices id (id is the position in the list above, starting with index 0) at both end\n0 1\n0 2\n1 2\n1 3\n2 3\n1 4\n3 4\n4 5\n4 6\n5 6\n2 7\n3 7\n3 8\n7 8\n7 9\n8 9\n8 10\n9 10\n5 10\n0 11\n0 12\n11 12\n11 13\n12 13\n11 14\n13 14\n14 15\n14 16\n15 16\n12 17\n13 17\n13 18\n17 18\n17 19\n18 19\n18 20\n19 20\n15 20\n10 20\n\n# Unknow external forces  (anchoring of the structure to the ground) : vertices id and direction (unit norm)\n10  1 0\n10  0 1\n20  0 1\n\n# Known external forces  (load applied to the structure) : vertices id and direction (norm of vector proportionnal to the load)\n0  0 -2\n',
    forces: '# Expected output: \n# tension in each element (beam or cable, positive value for traction, negative value for compression)\n# and force in anchoring links (positive along the provided direction, negative if in the oppositie direction)\n# one value per line\n1.5384615384615383\n-4.123105625617661\n-0.3846153846153848\n1.5858098560067921\n1.5384615384615392\n0\n0\n0\n0\n0\n-5.708915481624453\n-1.153846153846154\n3.440104580768908\n-0.9514859136040758\n-5.160156871153362\n-0.5769230769230771\n2.861962334197791\n-5.442681422340349\n0\n1.5384615384615385\n-4.123105625617661\n-0.38461538461538464\n1.5858098560067924\n1.5384615384615385\n0\n0\n0\n0\n0\n-5.7089154816244525\n-1.153846153846154\n3.4401045807689075\n-0.9514859136040751\n-5.160156871153362\n-0.5769230769230771\n2.861962334197791\n-5.442681422340349\n0\n2.4615384615384617\n0\n1.0000000000000004\n1.0000000000000002\n' } ]

function get_input_data(previous_steps) {
	var test_case = test_cases[previous_steps.length];
	if (!test_case) return;
	return test_case.struct;
}

function submit_output_data(output_data, previous_steps) {
	var test_case = test_cases[previous_steps.length];
	var expected_answer	= test_case.forces;
	var expected_values = expected_answer.split("\n").map(x => x.trim()).filter(line => line!="" && line[0]!="#");
	var actual_values     = output_data.split("\n").map(x => x.trim()).filter(line => line!="" && line[0]!="#");

	if (expected_values.length != actual_values.length)
		return { completed: 0, result: 0, msg: "expected_values.length "+expected_values.length+" != actual_values.length "+actual_values.length, iterate: false };

	var n = expected_values.length;
	for (var i=0; i<n; i++) {
		if (Math.abs(expected_values[i]-actual_values[i])>1e-5)
			return { completed: 0, result: 0, msg: "expected_value "+expected_values[i]+" != actual_value "+actual_values[i]+" at pos "+i, iterate: true };
	}

	return { completed: 1, result: 1 , msg: "well done", iterate: true};
}


module.exports = {
	get_input_data: get_input_data,
	submit_output_data: submit_output_data
	};


// ----------------------------------------------------------------------------

const fs = require('fs');

function proposed_solution() {
	var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').filter(line => line[0]!='#');
	//console.log("# input_data", input_data)

	console.log("# dummy\n"+123+"\n"+2+"\n"+3+"\n"+4+"\n"+5+"\n"+6+"\n"+7+"\n"+8+"\n");
}

if (typeof require != "undefined" && require.main === module) {
    if (process.argv.length>2)
		proposed_solution();
}