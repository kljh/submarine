


function get_input_data(previous_steps) {
	var iteration = previous_steps.length
	if (iteration>=test_input.length)
		return; // return undefined => HTTP status 404 => submission script does not iterate

	return test_input[iteration];
}


function submit_output_data(output_data, previous_steps) {
	var user_out = output_data.split("\n").filter(x => !!x).map(x => x.trim());

	var iteration = previous_steps.length
	var ref_out = test_output[iteration].split("\n").filter(x => !!x).map(x => x.trim());

	console.log("user_out", user_out)
	console.log("ref_out", ref_out)

	if (user_out.length!=ref_out.length) {
		var msg = "received "+user_out.length+" non-empty rows, expecting "+ref_out.length+".";
		return { completed: 0, msg, iterate: false };
	}
	var n = user_out.length;

	nb_correct = 0;
	for (var i=0; i<n; i++)
		nb_correct  += user_out[i]===ref_out[i] ? 1 : 0;
	pct_correct = nb_correct / n;

	var completed = 0.5;
	var result = nb_correct == n ? 1.0 : 0.0; // you need to get all correct answers to score 1
	var msg = "correct answers: " + nb_correct + "/" + n;

	console.log({ completed, msg, result, iterate: true});
	return { completed, msg, result, iterate: true};
}


module.exports = {
	get_input_data: get_input_data,
	submit_output_data: submit_output_data
	};


// ----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const readline = require('readline');

var test_folder = path.join(__dirname, "futebol")
var test_input = fs.readdirSync(test_folder)
.filter(file => {
	return file.split(".").pop()=="in";
})
.map(file => {
	var n = file.substr(0, file.length-3).split("_").pop()*1;
	return [ n, file ];
})
.sort((a, b) => a[0]-b[0])
.map(x => fs.readFileSync(path.join(test_folder, x[1])));

var test_output = test_input
.map((f, i) => "case_"+(i+1)+".out")
.map(x => fs.readFileSync(path.join(test_folder, x), encoding="latin1"));

