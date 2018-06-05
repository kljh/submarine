var expressions = [ "3-1+4", "3.1-1.0+0.9", "123456789.12345+0.0123456789-123456789.12345" ];
var expected_answers = [ 6, 5, 0.0123456789 ];
	
function get_input_data(previous_steps) {
	var expression	= expressions[previous_steps.length];
	if (!expression) return;

	var input_data = "# CALCULATE RESULT OF EXPRESSION BELOW.\n"
		+ "# RESULT TO BE WRITEN ON STDOUT\n" + expression;
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	var expected_answer	= expected_answers[previous_steps.length];
	
	var lines = output_data.split("\n").filter(line => line!="" && line[0]!="#");
	var received_answer = lines[0].received_answer * 1;
	var error = Math.abs(received_answer-expected_answer);
	var correct = error<1e-5;
	
	var completed = correct ? 0.5 : 0;
	var msg = correct ? "well done" : "received "+received_answer+", expected "+expected_answer;
	var result = error;
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
	var expr = input_data[0];
	console.log("expr", expr)
	
	var res = evaluate_expression(expr);
	console.log(res);
}

function evaluate_expression(expr) {
	var f = Function("return "+expr);
	return f();
}


console.log(evaluate_expression(expressions[0]));
console.log(evaluate_expression(expressions[1]));
console.log(evaluate_expression(expressions[2]));
