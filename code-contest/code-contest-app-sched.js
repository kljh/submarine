	
function get_input_data(previous_steps) {
	var n = previous_steps.length;

	throw new Error("to do");
	var input_data = "#";
	return input_data;
}

function submit_output_data(output_data, previous_steps) {
	var lines = output_data.split("\n").filter(line => line!="" && line[0]!="#");

	throw new Error("to do");
	return { completed: completed, result: result, msg: msg, iterate: true};
}


module.exports = {
	get_input_data: get_input_data, 
	submit_output_data: submit_output_data
	};


// ----------------------------------------------------------------------------

const fs = require('fs');
const readline = require('readline');

var N;
var T;
var K;
var Steve = [];
var Threads = [];

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

	for(var i=0;i<T;i++)
	{
		Threads.push([]);
	}
}

function read_strategy(input_data)
{
	console.log("# strategy:" ,input_data)

	for(var i=0;i<T;i++)
	{
		var oids = input_data[i].split(' ');
		for(var j=0;j<oids.length;j++)
		{
			Threads[i].push(parseInt(oids[j]));
		}
	}
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

function evaluate(jobs,strategy)
{
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
			if(isThreadFree(i,queue) && canRun(jobs[strategy[i][0]-1],finishedJobs))
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
			console.log("ERROR")
			break;
		}


		// we update minIncrement at the end of the loop, otherwise bug xD
		currentTime += minIncrement;
	}
}

function proposed_solution() {
	console.log("Proposed solution")
	var input_data_file = process.argv[2];
	var f = fs.openSync(input_data_file, 'r');
	var input_data = fs.readFileSync(input_data_file,{ "encoding" : "utf-8" }).split('\n').map(line => line.trim()).filter(line => line[0]!='#');

	read_input_data(input_data)

	f = fs.openSync(process.argv[3], 'r');
	input_data = fs.readFileSync(process.argv[3],{"encoding":"utf-8"}).split('\n').map(line => line.trim()).filter(line => line[0]!='#');

	read_strategy(input_data)
	
	console.log(Steve)
	console.log(Threads)

	evaluate(Steve,Threads)
}

if (process.argv.length>3) proposed_solution();