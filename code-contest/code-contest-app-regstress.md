# Problem : Register Stress

We have a directed acyclic graph (DAG) with a single terminal vertex.
You can move those stones on the graph and the purpose is to reach the end of the graph as fast as
possible!

You have k stones available to use as you wish
- Rule #1: You can place a stone on any root vertex v i .
- Rule #2: You can place a stone on any non-root vertex v j as long as there is all its predecessors v i
have a stone placed

You have 2 possible operations:
- Operation #1: Place a stone that was not placed on the graph
- Operation #2: Remove a stone from a vertex v i , and place it on a vertex v j (Rule #2 is checked before
performing Operation #2, so v i can be a predecessor of v j )
(We can leave stones on the graph even if we don't need them anymore, so no need to actually
create a remove operation)

The vertices are numbered from 1 to N, and the final vertex to reach is the N-th one.
Describe a strategy that minimize the number of moves to place a stone on the last vertex.

Note that input data can contain comments. Comments start with #. You should also ignore all the
blank lines.
The first line of the input contains the number of vertices and the number of stones.
The subsequent lines contains arcs: <predecessor vertex> <successor vertex>

Your output should be your strategy, each line corresponding to a move. <destination vertex>
[<optional source vertex>]
Note that you can output comments as well.

## Sample input:

```
# <number of vertices> <number of stones>
5 2
# <predecessor vertex> <successor vertex>
1 2
1 3
2 4 # This is just a comment
3 4
4 5
```

## Sample output (in 5 moves)

```
# <destination vertex> [<optional source vertex>]
1    # Rule 1 & Operation 1
2    # Rule 2 & Operation 1
3 1  # Rule 2 & Operation 2
4 2  # Rule 2 & Operation 2
5 3  # Rule 2 & Operation 2
```

Rationale:
Evaluate (x^3+3*x)*5 can be decomposed in those basic instructions:
- Put x in vertex "1"
- Put x^3 in vertex "2" using vertex "1"
- Put 3*x in vertex "3" using vertex "1"
- Put x^3 + 3*x in vertex "4" using vertex "2" and "3"
- Put (x^3+3*x)*5 in vertex "5" using vertex "4"

How many CPU register do you need? The fewer the better.