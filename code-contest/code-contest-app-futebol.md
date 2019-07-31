# The Football Match

## Problem:

Rita really likes futebol and statistics. She tends to forget everything so to indulge both her passions she's keeping records of every match she attends.

She went to a football tournament and registered for fun the passes that players did in the matches she saw. She gave you that list but she did not wrote down from which team does a player belong to (or maybe she lost she paper, she doesn't remember).

Your problem is to identify members of the same football team, having only the list of passes.

## Easy version

For instance, from the list of passes:

- Subhadeep to Miguel
- Catarina to Gonçalo
- Gonçalo to Daniela
- Miguel to Pedro

You can infer that Miguel, Subhadeep and Pedro belong to the same team: Subhadeep passed to Miguel, who passed to Pedro.
You can also infer that Catarina, Daniela and Gonçalo also belong to the same team.

We can't tell wether Pedro and Gonçalo belong to the Same team.


## More difficult version

Some players are a clumsier, and they pass to opponents. 

For instance, Alfredo belongs to the Catarina, Daniela and Gonçalo's team , but he did the following passes:
- Alfredo to Catarina (25 times)
- Alfredo to Gonçalo (24 times)
- Alfredo to Pedro (6 times)
- Alfredo to Daniela (5 times)

Your friend also registered in the sheet that Alfredo has a 15% chance of making a wrong pass.


## Even more difficult version

Your friend have the same statistics for *todos podem jogar futebol*.

That's a popular version of football in Portugal where supporters in the stadium can go to the field and help their favorite player ([Wikipedia link](https://en.wikipedia.org/w/index.php?title=todos_podem_jogar_futebol&action=edit&redlink=1)).

It's not unusual to have 50,000 people on the field.

So pay attention to the scalability of your algorithms !

# Input file description

On the first line (space separated):
- number of players N, number of passes M, and number of questions to solve Q
On the following N lines:
- Percentage of failure of passes of a player
On the following M lines:
- A pass from player i to player j (0-based indices)
On the following Q lines, questions:
- Two indices i, j (0-based indices) meaning (Is player i from the same team as player j?)

Example:
```
4 2 3
0.0
0.0
0.0
0.0
0 1
1 2
0 1
0 2
0 3
```

Description of example

First line: \
We have 4 players (0 to 3), 2 passes, and 3 questions in this file

Subsequent 4 lines: \
All have a probability 0.0 of passing to an opponent

Subsequent 2 lines: 2 passes \
Player 0 to player 1, and player 1 to player 2

Subequent 3 lines: 3 questions \
Is player 0 from the same team as player 1?\
Is player 0 from the same team as player 2?\
Is player 0 from the same team as player 3?


# Output description

You should output Q lines, with the answer for the query in the format `i j K`,

- `i` and `j` are the indices (in the same order of the question), 
- `k` is `Y` if they are for the same team, and `N` if they are not (or you don't know)

Example:

```
0 1 Y
0 2 Y
0 3 N
```
