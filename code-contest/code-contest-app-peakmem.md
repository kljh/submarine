# Problem

Reorder a set of instructions to minimize peak memory consumption.

Example:
The two programs below are functionally equivalent.

They may however behave differently in terms of peak memory consumption:
- if B and C are both consuming a lot of memory, the second solution is better because it allows to free B and reclaim memory before allocating C.
- if A is consuming a lot of memory, the first solution is better because it frees memory earlier, releasing resources to calculate D, E, and F.

&nbsp;

First version:
```
fn main() {
    A = initA()
    B = f(A)
    C = f(A)
    free A
    D = f(B)
    free B
    E = f(C)
    free C
    F = f(D,E)
    free D,E
    return F
}
```

Second version:
```
fn main() {
    A = initA()
    B = f(A)
    D = f(B)
    free B
    C = f(A)
    free A
    E = f(C)
    free C
    F = f(D,E)
    free D,E
    return F
}
```

The problem, given the memory of each expression result, is to reorder the expressions and to minimize peak memory consumption.

# Input file description

On the first line :
- number of expressions N

On each of the subsequent N lines (space separated):
- first value: size of the ouput produced by the expression
- subsequent values: expressions used as input (0-based indices)

Example (corresponds to program above):
```
6
2
7 0
5 0
3 1
2 2
1 3 4
```

# Output file description

On the first line :
- number of expressions M (M<=N)

On each of the subsequent N lines (space separated):
- first value: expression to evaluate (0-based index)
- expression results that are no longer needed and can be freed (0-based indices)

Example:
```
6
0
1
3 1
2 0
4 2
5 3 4 5
```
