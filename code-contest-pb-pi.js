
function get_input_data(validated_tests) {
	if (validated_tests.length>5) 
		return;
	
	var nb_paths = 10;
	for (var i=0; i<validated_tests.length; i++)
		nb_paths *= 10;
	
	var input_data = "# CALCULATE PI WITH MONTE CARLO AND NUMBER OF PATHS GIVEN BELOW\n" + nb_paths;
	return input_data;
}

function submit_output_data(output_data) {
	var lines = output_data.split("\n").filter(line => line[0]!="#");
	var pi = 1*lines[0];
	var validated = Math.abs(pi-Math.PI) < 0.01;
	var suspicious = Math.abs(pi-Math.PI) < 1e-12;
	return { validated: validated, msg: (suspicious ? "well done" : "too good to be honest") };
}

module.exports = {
	get_input_data: get_input_data, 
	submit_output_data: submit_output_data
	};