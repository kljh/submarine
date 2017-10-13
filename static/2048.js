function init() {

    var el = document.getElementById('autoplay');
    el.addEventListener('change', function(e) {
        autoplay = e.target.checked;
    }, false);

    
    var body = document.getElementById('body');
    body.addEventListener('touchend', function(e) {
        e.preventDefault()
    }, false);

    document.addEventListener('keyup', function(e) {
        console.log(e);

        var swipe_fct = undefined;
        switch (e.code) {
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
                if (autoplay)
                    swipe_animate(auto_select_next_swipe(grid, swipe_fcts));
            }, autoplay?10:200);(grid);
        }
    }

    const n=4;
    var autoplay = false;
    var grid = [ 
        [ "", "", "", "" ],
        [ "", "", "", "" ],
        [ "", "", "", "" ],
        [ "", "", "", "" ]];
        
    add_number_randomly(grid);
    add_number_randomly(grid);    
    render(grid);

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
