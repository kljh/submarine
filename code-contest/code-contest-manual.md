# Code contest script

Solution to the problem can be implemented in any language.

A script fetches test input, run your program on your machine against it and upload your solution. This is repeated for all input until completion (unless an error is reported before).

[Download script](code-contest-submit.py) tested with Python 2.7 (should work with Python 3 too).


## Command line examples

Submit a Python solution for problem `prime` :

```
python code-contest-submit.py --uid "team-ensmp-2003" --pid "prime" --cmd python prime.py --src prime.py
````

Submit a Node solution for problem `pi`:

```
python code-contest-submit.py --uid "team-coimbra-2017" --pid "pi" --cmd node pi.js --src pi.js
````

Submit a C++ solution for problem `scheduling`, reading input from a file rather than stdin:

```
python code-contest-submit.py --uid "team-porto-2018" --pid "scheduling" --cmd scheduling.exe --src makefile scheduling.cpp --stdin false
```

Submit a Go solution for problem `peakmem`, enabling verbose mode to display yhe command being executed:

```
python code-contest-submit.py --uid "team-fcul-2019" --pid "peakmem" --cmd peakmem.exe --src makefile peakmem.go --verbose true
```

Display help:

```
python code-contest-submit.py --help
```


