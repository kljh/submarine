'use strict';

function auto_select_next_swipe(grid, swipe_fcts, calculate_score) {
    //return auto_select_next_swipe_no_iter(grid, swipe_fcts, calculate_score).swipe_fct;
    return auto_select_next_swipe_one_iter(grid, swipe_fcts, calculate_score).swipe_fct;
}

function auto_select_next_swipe_no_iter(grid, swipe_fcts, calculate_score) {
    var p = Math.ceil(Math.random()*4);
    var shuffled_swipe_fcts = swipe_fcts.slice(p).concat(swipe_fcts.slice(0, p));
    
    var swipe_fct_and_score = [];
    for (var swipe_fct of shuffled_swipe_fcts) {
        var new_grid = swipe_fct(grid);
        if (!new_grid) continue;

        var new_score = calculate_score(new_grid);
        var new_grid_eval = evaluate_grid(new_grid);
        swipe_fct_and_score.push({ swipe_fct: swipe_fct, score: new_score + new_grid_eval });
    }    
    if (swipe_fct_and_score.length==0) 
        return undefined; 
    
    swipe_fct_and_score.sort((lhs, rhs) => lhs.score<rhs.score );
    var best_swipe = swipe_fct_and_score[0];
    return best_swipe;
}

function auto_select_next_swipe_one_iter(grid, swipe_fcts, calculate_score) {
    var swipe_fct_and_score = [];
    for (var swipe_fct_1 of swipe_fcts) {
        // with that first swipe
        var new_grid = swipe_fct_1(grid);
        if (!new_grid) continue;

        // we can have the next number showing up in different places, leading to different outcomes
        var empty_coords = grid_empty_coords(new_grid);
        var empty_coords_scores = [];
        for (var empty_coord of empty_coords) {
            var new_new_grid = fill_empty_coords(new_grid, empty_coord);
            var swipe_2 = auto_select_next_swipe_no_iter(new_new_grid, swipe_fcts, calculate_score);
            if (swipe_2)
                empty_coords_scores.push(swipe_2.score)
        }
        if (empty_coords_scores.length==0) continue;

        // stats on worst, best and average outcomes
        var best_outcome = Math.max.apply(null, empty_coords_scores);
        var worst_outcome = Math.min.apply(null, empty_coords_scores);
        var avg_outcome = empty_coords_scores.reduce((acc, val) => acc+val, 0.0) / empty_coords_scores.length;

        swipe_fct_and_score.push({ swipe_fct: swipe_fct_1, 
            best_outcome: best_outcome, worst_outcome: worst_outcome, avg_outcome: avg_outcome,
            score: avg_outcome // <= score is average outcome 
            });
    }

    if (swipe_fct_and_score.length==0) 
        return undefined; 

    swipe_fct_and_score.sort((lhs, rhs) => lhs.score<rhs.score );
    var best_swipe = swipe_fct_and_score[0];
    return best_swipe;
}

function evaluate_grid(grid) {
    if (!grid) return 0;

    const n = 4;
    var score_best_config = 0;
    for (var weight_grid of weight_grids) {
        var score = 0;
        for (var i=0; i<n; i++)
            for (var j=0; j<n; j++)
                if (grid[i][j])
                    score += weight_grid[i][j] * grid[i][j];
        score_best_config = Math.max(score_best_config, score);
    }
    return score_best_config;
}

// version 1: we want gig number in corners and borders => does not encourage sequence of increasing numbers
const weight_grids_v1 = function() {   
    const corner = 4, border = 2, center = 0; // VAR
    var basic_grid = [
        [ corner, border, border, corner ],
        [ border, center, center, border ],
        [ border, center, center, border ],
        [ corner, border, border, corner ]];
    return [ basic_grid ];
}()

// version 2: we want to pack in corners 
const weight_grids = function() {
    var basic_grid_1 = [
        [  0,  0,  0,  0 ],
        [  0,  0,  0,  1 ],
        [  0,  1,  2,  5 ],
        [ 99, 40, 20, 10 ]];
    var basic_grid_2  = horizontal_symmetry(basic_grid_1);

    var grids = [ basic_grid_1, basic_grid_2 ];
    for (var k=0; k<3; k++) {
        basic_grid_1 = rotate_grid(basic_grid_1);
        basic_grid_2 = rotate_grid(basic_grid_2);
        grids.push(basic_grid_1);
        grids.push(basic_grid_2);
    }
    return grids;
}()

function horizontal_symmetry(grid) {
    const n = 4;
    var new_grid = new Array(n);
    for (var i=0; i<n; i++) {
        new_grid[i] = new Array(n);
        for (var j=0; j<n; j++)
            new_grid[i][j] = grid[i][n-j-1];
    }
    return new_grid;
}

function rotate_grid(grid) {
    return [
        [ grid[0][3], grid[1][3], grid[2][3], grid[3][3] ],
        [ grid[0][2], grid[1][2], grid[2][2], grid[3][2] ],
        [ grid[0][1], grid[1][1], grid[2][1], grid[3][1] ],
        [ grid[0][0], grid[1][0], grid[2][0], grid[3][0] ]]
}

function grid_empty_coords(grid) {
    const n = 4;
    var coords = [];
    for (var i=0; i<n; i++)
        for (var j=0; j<n; j++)
            if (!grid[i][j])
                coords.push({ i:i, j:j });
    return coords;
}

function fill_empty_coords(grid, coord) {
    var new_grid = JSON.parse(JSON.stringify(grid)); // clone
    new_grid[coord.i][coord.j] = 1; // fill with an annoying value
    return new_grid;
}
