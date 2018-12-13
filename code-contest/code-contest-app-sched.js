

function get_input_data(previous_steps) {
	var iteration = previous_steps.length;

	var input_data = test_input[iteration];
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	var iteration = previous_steps.length;
	var input_data = test_input[iteration];
	var problem = read_input_data(input_data);
	var solution = read_strategy(output_data)
	var score = evaluate(problem, solution);

	return { completed: 0.5, result: score, msg: msg, iterate: true};
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
	constructor(id,time)
	{
		this.id = id;
		this.time = parseInt(time);
		this.arr = [];
	}

	addDependency(dep_id)
	{
		this.arr.push(dep_id);
	}
}

function read_input_data(input_data)
{
	var Steve = [];

	console.log("# input: ",input_data)

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
	console.log("# strategy:" ,input_data)

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

function canRun(job,finishedJobs)
{
	for(var i=0;i<job.arr.length;i++)
		if(!finishedJobs[job.arr[i]-1])
			return false;

	return true;
}

function isThreadFree(tId,queue)
{
	for(var i=0;i<queue.length;i++)
	{
		if(queue[i][2] == tId)
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

function updateQueue(queue,minIncrement,finishedJobs,jobs)
{
	var nq = []; //new queue
	var nInc = 86400; //new increment

	for(var i=0;i<queue.length;i++)
	{
		item = queue[i];
		if(jobs[item[0]].time <= minIncrement)
			finishedJobs[item[0]] = true;
		else
		{
			nq.push([item[0],item[1]-minIncrement,item[2]]);
			if(item[1]-minIncrement < nInc)
				nInc = item[1]-minIncrement;
		}
	}

	return [nq,nInc]
}

function evaluate(pb,strategy)
{
	var T = pb.nbThreads;
	var jobs = pb.jobs;

	if (strategy.length>T)
		throw new Error("more thread in the solution ("+strategy.length+") than available ("+T+")");
	T = Math.min(T, strategy.length);

	var finishedJobs = new Array(jobs.length);
	var nextTimeStamp = new Array(jobs.length);
	var currentTime = 0;
	var queue = [];
	var minIncrement = 86400;

	//initialize
	for(var i=0;i<jobs.length;i++)
	{
		nextTimeStamp[i] = 0;
		finishedJobs[i] = false;
	}

	// forever loop
	for(;;)
	{
		uQ = updateQueue(queue,minIncrement,finishedJobs,jobs);
		queue = uQ[0];
		minIncrement = uQ[1];

		if(allDone(finishedJobs))
		{
			console.log("Time Spent: "+currentTime);
			break;
		}

		//At each current Time we check if we can already start the next job
		allStall = true;

		for(var i=0;i<T;i++)
		{
			console.log("# Check thread #",i)
			if(isThreadFree(i,queue) && strategy[i].length && canRun(jobs[strategy[i][0]-1],finishedJobs))
			{
				console.log(strategy[i][0],"can run now")
				allStall = false;
				if(jobs[strategy[i][0]-1].time < minIncrement)
					minIncrement = jobs[strategy[i][0]-1].time;
				queue.push([strategy[i][0]-1,jobs[strategy[i][0]-1].time,i]); //jobId,Time,Thread
				strategy[i].shift(); //we remove the first element of the list
			}
		}

		if(allStall)
		{
			console.log("ERROR");
			return 0;
			break;
		}


		// we update minIncrement at the end of the loop, otherwise bug xD
		currentTime += minIncrement;
	}
	return 86400  - currentTime;
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

//if (process.argv.length>3)
	proposed_solution();