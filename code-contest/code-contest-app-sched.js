

function get_input_data(previous_steps) {
	var iteration = previous_steps.length;

	var input_data = test_input[iteration];
	return input_data;
}

function submit_output_data(output_data, previous_steps, attempt_state, req) {
	var iteration = previous_steps.length;
	var input_data = test_input[iteration].split('\n').map(line => line.trim()).filter(line => line[0]!='#');
	var problem = read_input_data(input_data);
	var solution = read_strategy(output_data)
	var tmp = evaluate(problem, solution);
	return { completed: 0.5, result: tmp.score, msg: tmp.msg, iterate: true};
}


module.exports = {
	get_input_data: get_input_data,
	submit_output_data: submit_output_data
	};


// ----------------------------------------------------------------------------

const fs = require('fs');
const readline = require('readline');

var test_input_files = [];
for (var i=0; i<=20; i++) test_input_files.push("in"+i+".in");
for (var i=1; i<=10; i++) test_input_files.push("in_2_"+i+".in");

var test_input = test_input_files.map(file => fs.readFileSync(__dirname+'/sched/'+file, 'utf8')+"\n");
console.log("#test_input", test_input.length);

class Job {
	constructor(id,duration)
	{
		this.id = id;
		this.duration = parseInt(duration);
		this.predecessors = [];
	}

	addDependency(dep_id)
	{
		this.predecessors.push(dep_id);
	}
}

function read_input_data(input_data)
{
	var Steve = [];

	//console.log("# input: ",input_data)

	var spl = input_data[0].split(" ")
	N = parseInt(spl[0])
	T = parseInt(spl[1])
	K = parseInt(spl[2])

	for(var i=0;i<N;i++)
	{
		Steve.push(new Job(i+1,input_data[i+1]));
	}

	for(var i=0;i<K;i++)
	{
		var ndata = input_data[i+N+1].split(" ");
		Steve[parseInt(ndata[0])-1].addDependency(parseInt(ndata[1]));
	}


	return { nbThreads: T, jobs: Steve };
}

function read_strategy(input_data)
{
	input_data = input_data.split('\n').map(line => line.trim()).filter(line => line && line[0]!='#');
	//console.log("# strategy:" ,input_data)

	var Threads = [];
	var T = input_data.length;
	for(var i=0;i<T;i++)
	{
		Threads[i] = [];
		var oids = input_data[i].split(' ');
		for(var j=0;j<oids.length;j++)
		{
			Threads[i].push(parseInt(oids[j]));
		}
	}

	return Threads;
}

function jobPendingDeps(job, finishedJobs)
{
	for(var i=0;i<job.predecessors.length;i++)
		if(!finishedJobs[job.predecessors[i]-1])
			return job.predecessors[i];

	return;
}

function isThreadFree(tId,running_tasks)
{
	for(var i=0; i<running_tasks.length; i++)
	{
		if(running_tasks[i].thread_id == tId)
		{
			return false;
		}
	}

	return true;
}

function allDone(jobs)
{
	for(var i=0;i<jobs.length;i++)
		if(!jobs[i])
			return false;
	return true;
}

function getRunningTasks(running_tasks, currentTime, finishedJobs)
{
	var nRT = []; //new running_tasks
	var nInc = 86400; //new increment

	for(var i=0;i<running_tasks.length;i++)
	{
		item = running_tasks[i];
		if(item.tend <= currentTime)
			finishedJobs[item.jobidx] = true;
		else
		{
			nRT.push(item);
			nInc = Math.min(nInc, item.tend-currentTime);
		}
	}

	return { nRT, nInc };
}

function evaluate(pb,strategy)
{
	var T = pb.nbThreads;
	var jobs = pb.jobs;

	if (strategy.length>T)
		throw new Error("more thread in the solution ("+strategy.length+") than available ("+T+")");
	T = Math.min(T, strategy.length);

	var finishedJobs = new Array(jobs.length).fill(false);
	var nextTimeStamp = new Array(jobs.length).fill(0);
	var currentTime = 0;
	var running_tasks = [];
	var minIncrement = 86400;

	// forever loop
	for (var foreverLoopCount = 0; ; foreverLoopCount++)
	{
		var uQ = getRunningTasks(running_tasks, currentTime, finishedJobs);
		running_tasks = uQ.nRT; // tasks currently running
		minIncrement = uQ.nInc; // in how much time a next completing task ends

		if(allDone(finishedJobs))
		{
			//console.log("Time Spent: "+currentTime);
			break;
		}

		//At each current Time we check if we can already start the next job
		threads_starved = true;

		var msg = "At time "+currentTime+":\n";
		for(var i=0;i<T;i++)
		{
			//console.log("# Check thread #",i)
			if(isThreadFree(i,running_tasks) && strategy[i].length) {
				var deps = jobPendingDeps(jobs[strategy[i][0]-1], finishedJobs);
				if (!deps) 
				{
					//console.log(strategy[i][0], "can run now on thread "+i)
					threads_starved = false;
					minIncrement = Math.min(minIncrement, jobs[strategy[i][0]-1].duration);
					running_tasks.push({ 
						jobidx: strategy[i][0]-1,
						tstart: currentTime,
						tend:   currentTime + jobs[strategy[i][0]-1].duration,
						thread_id : i }); //jobId,Time,Thread

					strategy[i].shift(); //we remove the first element of the list
				} else {
					msg += " - task "+strategy[i][0]+" can't run now on thread "+i+". Depends on task "+deps+".\n";
					//console.log(strategy[i][0], "can't run now on thread "+i+". Depends on task "+deps+".");
					//if (strategy[i][0]==52) debugger;
				}
			} else if (strategy[i].length) {
				// move forward in time until all threads completed
				threads_starved = false;
				minIncrement = Math.min(minIncrement, jobs[strategy[i][0]-1].duration);
			}
		}

		var left_to_run = finishedJobs
			.map((b,idx) => { return { finished: b, id: idx+1 }; })
			.filter(job => !job.finished)
			.map(job => job.id)
			
		if (threads_starved && running_tasks.length==0 && left_to_run.length>0)
		{
			msg += "Task not run: " + JSON.stringify(left_to_run) + "\n";
			msg += "Threads_starved. No tasks either running or to run.\n";
			msg += "Strategies (unused chunk): "+JSON.stringify(strategy)+"\n";
			console.log("ERROR");
			console.log(msg)
			//throw new Error(msg)
			return { score: -1, msg: msg };
		}

		currentTime += minIncrement;
	}
	return { score: 86400  - currentTime, timeSpent: currentTime, msg: "" };
}

function proposed_solution() {
	console.log("Proposed solution")
	var input_data_file = process.argv[2] || __dirname+"\\sched\\in0.in";
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').map(line => line.trim()).filter(line => line[0]!='#');

	var Steve = read_input_data(input_data)

	var output_data_file = process.argv[3] || __dirname+"\\sched\\in0.out";
	input_data = fs.readFileSync(output_data_file,{"encoding":"utf-8"});
	var Threads = read_strategy(input_data)

	console.log(Steve)
	console.log(Threads)

	evaluate(Steve,Threads)
}

if (typeof require != "undefined" && require.main === module) {
	//if (process.argv.length>3)
		//proposed_solution();
}