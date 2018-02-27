'use strict';

function init() {

    var el = document.getElementById('autoplay');
    el.addEventListener('change', function(e) {
        autoplay = e.target.checked;
    }, false);

    
    var body = document.getElementById('body');
    var hammerOpts = undefined;
    var hammertime = new Hammer(body, hammerOpts);
    //hammertime.get('pinch').set({ enable: true });      // disabled by default
    //hammertime.get('rotate').set({ enable: true });     // disabled by default
    //hammertime.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });    // horizontal only by default
    hammertime.get('swipe').set({ direction: Hammer.DIRECTION_ALL });       // horizontal only by default
    hammertime.on('swipe', function(e) { console.log(e); });
    hammertime.on('swipeleft', function(e) { swipe_animate(swipe_left); });
    hammertime.on('swiperight', function(e) { swipe_animate(swipe_right); });
    hammertime.on('swipedown', function(e) { swipe_animate(swipe_down); });
    hammertime.on('swipeup', function(e) { swipe_animate(swipe_up); });

    document.addEventListener('keyup', function(e) {
        console.log(e);

        var swipe_fct = undefined;
        switch (e.code) {
            case "Space":
            case "KeyP":
                document.getElementById('autoplay').click();
                break;
            case "ArrowLeft": 
                swipe_fct = swipe_left;
                break;
            case "ArrowRight": 
                swipe_fct = swipe_right;
                break;
            case "ArrowDown": 
                swipe_fct = swipe_down;
                break;
            case "ArrowUp": 
                swipe_fct = swipe_up;
                break;
        }

        if (swipe_fct)
            swipe_animate(swipe_fct);

        e.preventDefault()
    }, false);
    
    var swipe_fcts = [ swipe_left, swipe_right, swipe_up, swipe_down ];
    
    function swipe_animate(swipe_fct) {
        var new_grid = swipe_fct(grid);
        if (new_grid) {
            grid = new_grid;
            render(grid);
            add_number_randomly(grid);
            setTimeout(() => {
                render(grid);
                if (autoplay) {
                    var next_swipe = auto_select_next_swipe(grid, swipe_fcts, calculate_score);
                    if (next_swipe)
                        swipe_animate(next_swipe);
                    else
                        alert("Game over");
                }
            }, autoplay?10:200);(grid);
        }
    }

    const n=4;
    var autoplay = false;

    function make_empty_grid() {
        return [ 
            [ "", "", "", "" ],
            [ "", "", "", "" ],
            [ "", "", "", "" ],
            [ "", "", "", "" ]];
    }
    var grid = make_empty_grid();
        
    add_number_randomly(grid);
    add_number_randomly(grid);    
    render(grid);

    autoplay_stats();
    function autoplay_stats() {
        var t0 = new Date();
        var nb_games = 250;
        var scores = [];
        var total = 0;
        for (var i=0; i<nb_games; i++) {
            var grid = make_empty_grid();
            add_number_randomly(grid);
            add_number_randomly(grid);    
            for (var j=0; j<500; j++) {
                var next_swipe = auto_select_next_swipe(grid, swipe_fcts, calculate_score);
                var next_grid = next_swipe ? next_swipe(grid) : undefined;
                if (next_grid) {
                    grid = next_grid;
                    add_number_randomly(grid);    
                } else {
                    var score = calculate_score(grid);
                    scores.push(score);
                    total += score;
                    break; // game over
                }
            }
        }
        nb_games = scores.length;
        var t1 = new Date();
        
        var el = document.getElementById('autoplay_stats');
        el.innerText = "autoplay_stats on "+nb_games+" games: average score "+Math.round(total/nb_games);
    }

    function render(grid) {
        var el = document.getElementById('score');
        el.innerText = ""+calculate_score(grid);
        
        for (var i=0; i<n; i++)
            for (var j=0; j<n; j++) {
                var el = document.getElementById(''+i+j);
                el.innerText = ""+grid[i][j];
                el.className = "color"+grid[i][j];
            }
    
    }

    function add_number_randomly(grid) {
        var nb_empty = 0;
        for (var i=0; i<n; i++)
            for (var j=0; j<n; j++)
                if (!grid[j][j])
                    nb_empty++;
        
        var v = Math.random()<0.84 ? 2 : 4;
        var p = Math.floor(Math.random()*nb_empty);
        var k = 0;
        for (var i=0; i<n; i++)
            for (var j=0; j<n; j++)
                if (!grid[i][j]) {
                    if (k==p) {
                        grid[i][j] = v;
                        return;
                    }
                    k++;
                }
    }

    function swipe_left(grid) {
        var score_incr = 0;
        var res = new Array(n);
        for (var i=0; i<n; i++) {
            var row = grid[i];
            var tmp = [];
            // get rid of blanks
            for (var j=0; j<n; j++)
                if (row[j]) 
                    tmp.push(row[j]);
            // aggregate
            for (var j=1; j<tmp.length; j++)
                if (tmp[j-1]==tmp[j]) {
                    score_incr += tmp[j]*2;
                    tmp.splice(j-1, 2, tmp[j]*2);
                }
            // pad with blanks
            for (; tmp.length<n;)
                tmp.push("");
            res[i] = tmp;
        }

        // only return a new grid if the move is allowed
        //score += score_incr;
        if (JSON.stringify(res)!=JSON.stringify(grid))
            return res;
    }

    function swipe_right(grid) {
        return mirror(swipe_left(mirror(grid)));
    }

    function swipe_up(grid) {
        return trsp(swipe_left(trsp(grid)));
    }

    function swipe_down(grid) {
        return trsp(mirror(swipe_left(mirror(trsp(grid)))));
    }

    function mirror(grid) {
        if (!grid) return;
        
        var tmp = [];
        for (var i=0; i<n; i++) {
            var row = [];
            for (var j=0; j<n; j++)
                row[j] = grid[i][n-1-j];
            tmp[i] = row;
        }
        return tmp;    
    }
    function trsp(grid) {
        if (!grid) return;

        var tmp = [];
        for (var i=0; i<n; i++) {
            var row = [];
            for (var j=0; j<n; j++)
                row[j] = grid[j][i];
            tmp[i] = row;
        }
        return tmp;
    }

    var score_map;
    function calculate_score(grid) {
        if (!grid) return;
        
        if (!score_map) {
            score_map = { "2": 0 };
            for (var v=2; v<8192; v*=2) 
                score_map[2*v] = 2 * (v+score_map[v]);
        }

        var score = 0;
        for (var i=0; i<n; i++)
            for (var j=0; j<n; j++)
                if (grid[i][j])
                    score += score_map[grid[i][j]];
        return score;
    }
}
