


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
	var result = pct_correct<1.0 ? 0.0 : 1.0; // you need to get all correct answers to score 1
	var msg = "correct answers: " + nb_correct + "/" + n;

	console.log({ completed, msg, result, iterate: true});
	return { completed, msg, iterate: true};
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

function proposed_solution() {
	var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').filter(line => line[0]!='#');
	console.log("# input_data", input_data)
	var n = 1*input_data[0];
	console.log("# n", n)

	var factors = prime_factorisation(n)
	console.log(factors.join(","));
}

function prime_factorisation(n) {
	// The simplest method of finding factors is so-called "direct search factorization" (a.k.a. trial division). It is practical only for very small numbers.
	// The fastest-known fully proven deterministic algorithm is the Pollard-Strassen method (Pomerance 1982; Hardy et al. 1990).
	var factors = []
	while (n%2==0) { factors.push(2); n /= 2; }

	var m=Math.sqrt(n)+1;
	for (var i=3; i<=m; i+=2) {
		while (n%i==0) { factors.push(i); n /= i; }
		if (n==1) break;
	}
	if (n!=1) factors.push(n);
	return factors;
}


if (process.argv.length>2) proposed_solution();
