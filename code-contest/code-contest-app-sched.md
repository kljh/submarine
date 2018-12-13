# Task scheduling

## Problem description

You have N jobs (j_1,...j_N) to run and T execution threads (t_1,...t_T).
You also have a set of job dependencies. Job i may depende on job j
Each task duration is a known integer denoted by s_i.
We assume that there is no communciation cost between threads

Your goal is to output a strategy that minimizes the time spent to complete the jobs.


## Standard Input

The first line of the input will have three integers: N, T and K. N represents the number of jobs, T the number of threads and K the number of dependencies
The following N lines contain the time spent to calculate each job (first of this N lines for job 1, last to job N) 
The last K lines will have two integers each representing dependencies: id_1 id_2, which means that job id_1 depends on job id_2


## Standard Output

You should output the task ids (ordered in time) for each thread (one thread per line)

## Evaluation of the strategy:

We will evaluate the strategy the following way:
- For all the threads each job will try to be executed as soon as the previous is finished (unless it depends on some job that was not computed already. In this case it will hold until the job is completed - this may cause a timeout.
- We will consider 86400 time units as the timeout of each run (the sum of all jobs wil be less than 86400)

## Constraints

1 <= P <= N < 500
Timeout <= 86400

## Score

For each output,
If you have a valid strategy, your score is 86400-Time took by your strategy. Otherwise you will score 0.

## Sample Input Example

```
3 1 2
10
10
20
1 2
2 3
```

## Sample Output Example

```
3 2 1
```
