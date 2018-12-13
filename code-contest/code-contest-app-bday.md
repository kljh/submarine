# Problem : Birthday on the trading floor

It's your birthday. It's 5pm, the financial markets are close.

One of your trader friend offers you an unusual present. 
- He gives you a file with all the price of the day, "the ticks". 
- He offer you to back-date a buy-sell transaction. You choose a index *i* where you buy the stock, a time *j* (greater than *i*) where you sell it, and because you know the pass you can choose *i* and *j* that maximize *Price<sub>j</sub> - Price<sub>i</sub>*

Of course, you are expected to be smart so your code should cope with big data ("ticks" every milliseconds).


## Sample input:

```
# Number of prices 
10

# Prices of the day 
87 88 90.2 89 88.5 86 84 79 80 78 
```

## Sample output (in 5 moves)

```
# Buy time, sell time
0 2
```
