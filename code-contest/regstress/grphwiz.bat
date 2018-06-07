set path=C:\Tools\graphviz-2.38\release\bin;%path%

for %%f  in (*.dot) do  dot %%f -Tpng -o %%f.png

