# Yet another prisoner problem #

The director of a prison believes that good scientific education is a reliable evidence that a prisoner is no longer a threat to society and deserves to be free.

Pairs of prisoners will be given the following challenge.

- In a room, there will be 100 drawers numbered 0 to 99.
In each drawer, there will be a ball. Balls will also be numbered 0 to 99.
The directors is free to decide to put balls in any order of his choice in the drawers (sorted, random, semi-random, or following a pattern of his choice).

- The first prisoner will enter in the room. He will be able to see the content of each drawer. He will be allowed to swap two balls from two drawers (to be exact he will be able to tell two drawer indices, and a guard will swap the balls for him).
He then will leave the room and will not be able to communicate to his jail-mate.

- All drawers will be closed. Then, the second prisoner will enter in the room. The director will decide randomly a number between 0 and 99. The second prisoner will then have 50 attempts to find the drawer containing ball with that number.

Both prisoners are freed in case of success, otherwise they are sent again to the prison's library where they can keep studying for another few years. 

The prisoners are aware of the challenge in advance and they are given time to decide a strategy that maximize their chance to get out.

# Input-output data format (1st prisoner)

## Input data format

```
# prisoner id (always 1 for first prisoner)
1

# ball numbers in drawers 0 to 99 (space separated)
86 2 17 9 82 46 51 39 8 12 62 72 15 44 67 91 16 61 60 56 84 21 10 87 30 29 43 34 28 49 18 4 27 80 42 96 64 45 92 95 13 66 74 94 89 33 76 65 68 53 98 6 85 55 23 3 58 63 79 26 52 59 71 83 5 97 78 14 73 35 88 37 36 75 38 40 48 25 77 7 57 31 22 93 0 69 81 90 32 41 11 20 24 1 70 54 47 99 19 50
```


## Output data format

```
# Indices of the two drawers to swap (Be careful, reply with drawer number, not ball numbers). If indices are equal, then no ball will be swapped.
17 83
```

# Input-Output data format (2nd prisoner)

## Input data format (1st iteration)

In example below, the prisoner must find ball numbered 45. 

```
# prisoner id (always 2 for first prisoner)
2

# ball to find
45

# number of attempts used so far
0
```

## Output data format (1st iteration)

```
# drawer to open
17
```

## Input data format (2nd iteration)

The prisoner still looks for ball numbered 45. He opened drawer 17, it's a failed attempt since this drawer contained ball numbered 31. 

```
# prisoner id (always 2 for first prisoner)
2

# ball to find
45

# number of attempts used so far
1

# previous attempts (if any): drawer opened and ball found within
17 31
```

## Output data format (2st iteration)

```
# drawer to open
82
```

## Input data format (3rd iteration)

The prisoner opened drawers 17 and 82, two failed attempt. Only 48 attempts left!!

```
# prisoner id (always 2 for first prisoner)
2

# ball to find
45

# number of attempts used so far
2

# previous attempts (if any): drawer opened and ball found within
17 31
82 60
```

## Output data format (3rd iteration)

The prisoner decides to use his lucky number 88. Why not :-)

```
# drawer to open
88
```

# Behavior of submission script and scoring

Prisoners in this contest are expected to have high level of ethics and they wouldn't cheat. 

If you are still tempted to cheat, please make it smartly as the director has authority to extend your jail time indefinitely if you do not pass code review. Our advice: don't take the risk.

The submission script will process as follow: 
1. it will call your code with the input data for prisoner 1, and you will reply with the drawers to swap
2. then it will repeatedly call your code with the input date for with the input data for prisoner 2 (generated from step 1 with possible relabelling), and you will reply with the drawer you want to open till you find the correct ball reach the attempts limit.

Teams of prisoners will be ranked by success rate (averaged between all attempts).

Accordingly, the script will repeat steps 1. and 2. above a few time to make it less random.




