'use strict';

function auto_select_next_swipe(grid, swipe_fcts, calculate_score) {
    var p = Math.ceil(Math.random()*4);

    var shuffled_swipe_fcts = swipe_fcts.slice(p).concat(swipe_fcts.slice(0, p));
    
    var swipe_fct_and_score = [];
    for (var swipe_fct of shuffled_swipe_fcts) {
        var new_grid = swipe_fct(grid);
        var new_score = calculate_score(new_grid);
        if (new_grid) {
            //return swipe_fct;
            swipe_fct_and_score.push({ swipe_fct: swipe_fct, score: new_score });
        }
    }
    
    if (swipe_fct_and_score.length) {
        swipe_fct_and_score.sort((lhs, rhs) => lhs.score<rhs.score );
        return swipe_fct_and_score[0].swipe_fct;
    }
    return undefined;
}