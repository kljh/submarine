function auto_select_next_swipe(grid, swipe_fcts) {
    var p = Math.ceil(Math.random()*4);

    var shuffled_swipe_fcts = swipe_fcts.slice(p).concat(swipe_fcts.slice(0, p));
    
    for (var swipe_fct of shuffled_swipe_fcts)
        if (swipe_fct(grid)) 
            return swipe_fct;
    alert("Game over");
}