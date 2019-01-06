const fs = require('fs');
const rs = require('./code-contest-app-regstress.js');

var bDebug = false;

// STATUS 7 : RECORDED ERROR: Error: can't put stone in 10: no stone in predecessor 1 at step 9. 10 3
// STATUS 15 : RECORDED ERROR: Error: no stone in last vertices (20) after final step.
// STATUS 17 : RECORDED ERROR: Error: can't put stone in 20: no stone in predecessor 5 at step 18. 20 8
var default_path = ".code-contest-submit/regstress-15.txt"


var pred, nbStones;
var nb, stone, hard;

function proposed_solution() {
	var path = process.argv[2] || default_path // "regstress/trivial_4v_2r.txt";
	var txt = fs.readFileSync(path, 'utf8');
	var gr = rs.read_graph(txt)
	pred = gr.pred;
	nbStones = gr.nbStones;
	stone = new Array(gr.nbVertices+1).fill(0); // ).map(_ => []);
	hard = new Array(gr.nbVertices+1).fill(0); // ).map(_ => []);
	if (bDebug) console.log(gr);
	
	nb = rs.calc_min_nbstones(gr.pred, true);
	if (bDebug)  console.log(nb)
	
	evaluate_node(gr.nbVertices)
}

function evaluate_node(node_id) {
	if (bDebug) console.log("evaluate_node", node_id);
	
	var my_preds = pred[node_id];
	// shall reorder with most costly first
	my_preds = my_preds.sort((a, b) => (nb[b] - nb[a]));
	
	var evaluated_for_me = []
	for (var p=0; p<my_preds.length; p++) {
		if (stone[my_preds[p]]) continue;
		else {
			evaluate_node(my_preds[p]);
			evaluated_for_me.push(my_preds[p])
		}
	}
	
	// all parents done :-)
	
	// our parents can be now free
	//for (var p=0; p<my_preds.length; p++) 
	//	hard[my_preds[p]] --;
	for (var p=0; p<evaluated_for_me.length; p++) 
		hard[evaluated_for_me[p]] --;
	
	// put a stone 
	var from_node_id = get_stone_from();
	stone[node_id] ++;
	// and make sure it stays here
	hard[node_id] ++;
	console.log(node_id+" "+from_node_id + (bDebug?" nb="+stone[node_id]+" hard="+hard[node_id]:""))
	
}

function get_stone_from() {
	if (nbStones) {
		nbStones--;
		return "";
	}
	
	if (bDebug) console.log("need to retrieve a stone");
	for (var i=0; i<pred.length; i++) {
		if (bDebug && stone[i]) 
			console.log("  "+stone[i]+" stone in "+i+", nailed here "+hard[i]+" times");
	
		if (stone[i] && !hard[i]) {
			stone[i] --;
			return i;
		}
	}
	throw new Error("no more stones");
}

proposed_solution();
