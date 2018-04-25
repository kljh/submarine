
function get_input_data(previous_steps) {
	if (previous_steps.length>6) 
		return; // return undefined => HTTP status 404 => submission script does not iterate
	
	var nb_paths = 100;
	for (var i=0; i<previous_steps.length; i++)
		nb_paths *= 10;
	
	var input_data = "# CALCULATE PI WITH MONTE CARLO AND NUMBER OF PATHS GIVEN BELOW\n" + nb_paths;
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	// parse output of program
	var lines = output_data.split("\n").filter(line => line!="" && line[0]!="#");
	var pi = 1*lines[0];
	var result = pi //Math.abs(pi-Math.PI);

	var completed = Math.abs(pi-Math.PI) < 1e-5 ? 1 : 0.5;
	var suspicious = Math.abs(pi-Math.PI) < 1e-12;
	var msg = completed==1 ? (!suspicious ? "well done" : "too good to be honest") : "quite far: "+result;
	
	return { completed: completed, result: result, msg: msg, iterate: true};
}

module.exports = {
	get_input_data: get_input_data, 
	submit_output_data: submit_output_data
	};

// ----------------------------------------------------------------------------

const fs = require('fs');
const readline = require('readline');

function proposed_solution() {
	var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').filter(line => line[0]!='#');
	console.log("# input_data", input_data)
	var nb_paths = 1*input_data[0];
	console.log("# nb_paths", nb_paths)

	var pi = 0;
	for (var i=0; i<nb_paths; i++) {
		var x = Math.random(), 
			y = Math.random();
		/*if ( y<(1-x)) { 
			x = 1-y;
			y = 1-x;
		}*/
		if ((x*x+y*y)<1.0)
			pi++;
	}
	pi /= nb_paths;
	pi *= 4.0;
	
	console.log(pi)
}

if (process.argv.length>2) proposed_solution();