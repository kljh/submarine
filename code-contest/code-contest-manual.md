# Code contest script

Solution to the problem can be implemented in any language.

A script fetches test input, run your program on your machine against it and upload your solution. This is repeated for all input until completion (unless an error is reported before).

[Download script](code-contest-submit.py) tested with Python 2.7 (should work with Python 3 too).


## Command line examples

Submit a Python solution for problem `prime` :

```
python code-contest-submit.py --uid "team-ensmp-2003" --pid "prime"
  --cmd python prime.py
  --src prime.py
```

Submit a Node solution for problem `pi`, enabling verbose mode :

```
python code-contest-submit.py --uid "team-coimbra-2018" --pid "pi"
  --cmd node pi.js
  --src pi.js
  --verbose true
```

Submit a C++ solution for problem `scheduling`, reading input from a file rather than stdin:

```
python code-contest-submit.py --uid "team-porto-2018" --pid "scheduling"
  --cmd scheduling.exe
  --src makefile scheduling.cpp
  --stdin false
```

Submit a Go solution for problem `peakmem`, uploading a `src` folder:

```
python code-contest-submit.py --uid "team-fcul-2019" --pid "peakmem"
  --cmd peakmem.exe
  --src src
```

Display help:

```
python code-contest-submit.py --help
```


