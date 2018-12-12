

function get_input_data(previous_steps, attempt_state) {
	if (previous_steps.length>500)
        return; // return undefined => HTTP status 404 => submission script does not iterate

    var nb_challenges = attempt_state.nb_challenges || 0;
    if (nb_challenges>5)
        return; // return undefined => HTTP status 404 => submission script does not iterate

    var player1 = attempt_state.ball_to_find===undefined
    if (player1) {
        // return a shuffled vector and ask for a permutation
        attempt_state.drawers = random_permutation(100);
        attempt_state.nb_challenges = nb_challenges + 1;

        var input_data = "# prisoner id (always 1 for first prisoner)\n1\n\n"
            + "# ball numbers in drawers 0 to 99 (space separated)\n"
            + attempt_state.drawers.join(" ") + "\n";

        return input_data;
    } else {
        var ball_to_find = attempt_state.ball_to_find;
        var previous_attempts = attempt_state.attempts;
        var nb_attempts_so_far = previous_attempts.length;

        // give an attempt to find a given ball
        var input_data = "# prisoner id (always 2 for first prisoner)\n2\n\n"
            + "# ball to find\n" + ball_to_find+"\n\n"
            + "# number of attempts used so far\n" + nb_attempts_so_far + "\n\n"
            + "# previous attempts (if any): drawer opened and ball found within\n"
            + previous_attempts.map(tmp => tmp.join(" ")).join("\n") + "\n";

        return input_data;
	}
}

function submit_output_data(output_data, previous_steps, attempt_state) {
	// parse output of program
    var lines = output_data.split("\n").map(line => line.trim()).filter(line => line!="" && line[0]!="#");

    var player1 = attempt_state.ball_to_find===undefined;
    var completed, result, msg, iterate;
    var drawers = attempt_state.drawers;

    if (player1) {
        var data = lines[0].split(" ").map(val => val.trim()).filter(val => val!="").map(val => val*1);

        // swap
        var tmp = drawers[data[0]];
        drawers[data[0]] = drawers[data[1]];
        drawers[data[1]] = tmp;

        // and prepare for player 2
        attempt_state.ball_to_find = Math.floor(Math.random()*100);
        attempt_state.attempts = [];

        var msg = "swapped content of drawers "+data[0]+" and "+data[1];
        return { completed: completed, result: result, msg: msg, iterate: true};
    } else {
        var drawer_opened = lines[0]*1;
        var ball_in_drawer = drawers[drawer_opened];
        attempt_state.attempts.push([ drawer_opened, ball_in_drawer ]);

        var nb_attempts_so_far = attempt_state.attempts.length;

        var success = ball_in_drawer==attempt_state.ball_to_find && nb_attempts_so_far<=50;
        var almost = ball_in_drawer==attempt_state.ball_to_find && nb_attempts_so_far<=100;
        var failure = nb_attempts_so_far>100;

        // we're actually not enforcing the 50 attempts limit :-)
        // we're simply measuring how many attempts are used

        if (success) { result = nb_attempts_so_far; msg = "well done"; };
        if (almost) { result = nb_attempts_so_far; msg = "not quite"; };
        if (failure) { completed = 0; result = 999; msg = "way to many attempts"; }

        if (success || almost || failure) {
            delete attempt_state.ball_to_find;
            delete attempt_state.attempts;
        }

        return { completed: completed, result: result, msg: msg, iterate: true};
    }
}

module.exports = {
	get_input_data: get_input_data,
	submit_output_data: submit_output_data
	};

// ----------------------------------------------------------------------------

function random_permutation(n) {
    var p = new Array(n).fill(0).map((x,i)=>i);
    for (var i=0; i<n; i++) {
        var j = Math.floor(Math.random()*n);
        var tmp = p[i];
        p[i] = p[j];
        p[j] = tmp;
    }
    return p;
}

// ----------------------------------------------------------------------------

function proposed_solution() {
    var fs = require('fs');
    var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').map(line => line.trim()).filter(line => line && line[0]!='#');
	var player = 1*input_data.shift();

    if (player==1) {
        // prisoner 1
        var i=0, j=99;
        console.log("# dummy hardcoded swap: first and last element\n"+i+" "+j+"\n");
    } else {
        // prisoner 2
        var ball_to_find = 1*input_data.shift();
        var nb_attempts_so_far = 1*input_data.shift();
        var attempts = [];
        for (var i=0; i<nb_attempts_so_far; i++) {
            var tmp = input_data.shift().split(' ').map(val => val.trim()).filter(val => !!val).map(val => val*1);
            attempts.push({ drawer: tmp[0], ball: tmp[1] });
        }

        var reply_header = "# drawer to open\n";
        if (nb_attempts_so_far==0) {
            console.log(reply_header + ball_to_find + "\n");
        } else {
            console.log(reply_header + attempts.pop().ball + "\n");
        }
    }
}

if (typeof require != "undefined" && require.main === module) {
    //tests
    //console.log(random_permutation(100).join(" "))

    if (process.argv.length>2)
        proposed_solution();
}
