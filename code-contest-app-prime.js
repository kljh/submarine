var numbers = [ 17, 42, 121, 1073, 12077, 120771 ];
	
function get_input_data(previous_steps) {
	var n = numbers[previous_steps.length];
	if (n===undefined) return;

	var input_data = "# CALCULATE PRIME FACTORIZATION OF NUMBER BELOW.\n"
		+ "# RESULT TO BE WRITEN ON STDOUT, ON ONE LINE, AS A COMMA-SEPARATED LIST OF NUMBERS\n" + n;
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	var lines = output_data.split("\n").filter(line => line[0]!="#");
	var factors_received = lines[0].split(",").map(x => x.trim()*1).sort();
	var factors_expected = prime_factorisation(numbers[previous_steps.length]).sort();
	var correct = JSON.stringify(factors_received)==JSON.stringify(factors_expected);
	//console.log("factors_received", factors_received);
	//console.log("factors_expected", factors_expected);
	
	var completed = correct ? 0.5 : 0;
	var msg = correct ? "well done" : "received "+factors_received+", expected "+factors_expected;
	var result = correct ? 1 : -1;
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
