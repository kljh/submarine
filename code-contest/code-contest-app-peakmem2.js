function add_node_metrics(nodes) {
	for (var node of nodes) {
		node.root_rank = -1;
		node.leaf_rank = -1;
	}

	// from root
	function metrics_from_root(node) {
		if (node.roof_rank != -1) return;

		for (var p of node.sources)
			metrics_from_root(nodes[p]);

		var rank = 0;
		for (var p of node.sources) {
			rank = Math.max(rank, nodes[p].root_rank+1);
		}
		node.root_rank = rank;
	}

	for (var node of nodes)
		metrics_from_root(node);


	// from leaf
	function metrics_from_leaf(node) {
		if (node.leaf_rank != -1) return;

		for (var p of node.sources)
			metrics_from_leaf(nodes[p]);

		var rank = 0;
		for (var p of node.sinks) {
			rank = Math.max(rank, nodes[p].leaf_rank+1);
		}
		node.leaf_rank = rank;
	}

	for (var node of nodes)
		metrics_from_leaf(node);

	return nodes;
}

function depth_first_solution(grph) {
	var nodes = grph.footprints.map((footprint, id) => { return { id, footprint, sources:  grph.sources[id], sinks:  grph.sinks[id] }; });
	var nodes = add_node_metrics(nodes);
	var root_ids = nodes.filter(x => x.sources.length==0).map(x => x.id);

	var operations = []
	var calculated_ids = new Set();

	function recurse(root_ids) {
		// use metrics to improve improve root_ids ordering
		for (var id of root_ids) {
			var node = nodes[id];

			if (calculated_ids.has(id))
				continue;

			if (is_calculable(node, calculated_ids)) {
				// calculate node
				//console.log(id, "calculated")
				calculated_ids.add(id);
				// free no longer needed parents
				var freeable_ids = get_new_freeable_ids(node, nodes, calculated_ids);
				operations.push(id + " " + freeable_ids.join(" "));
				// go to children (depth first)
				recurse(node.sinks);
			} else {
				//console.log(id, "not calculable yet")
			}
		}
	}

	recurse(root_ids);

	var solution = operations.length + "\n" + operations.join("\n");
	return solution;
}

function is_calculable(node, calculated_ids) {
	var calculable = true;
	for (var p of node.sources)
		if (!calculated_ids.has(p)) {
			calculable = false; break; }
	return calculable;
}

function get_new_freeable_ids(node, nodes, calculated_ids) {
	var freeable_ids = new Set();
	for (var p of node.sources) {
		var prec = nodes[p];
		if (is_freeable(prec, calculated_ids))
			freeable_ids.add(p);
	}
	return [...freeable_ids];
}

function is_freeable(node, calculated_ids) {
	var freeable = true;
	for (var s of node.sinks)
		if (!calculated_ids.has(s)) {
			freeable = false; break; }
	return freeable;
}

function comprehensive_solution(grph) {
	var nodes = grph.footprints.map((footprint, id) => { return { id, footprint, sources:  grph.sources[id], sinks:  grph.sinks[id] }; });
	var root_ids = nodes.filter(x => x.sources.length==0).map(x => x.id);


	function get_new_calculable_ids(try_id, calculated_ids, calculable_ids) {
		var new_calculable_ids = new Set(calculable_ids);
		new_calculable_ids.delete(try_id);

		var node = nodes[try_id];
		for (var s of node.sinks) {
			var succ = nodes[s];
			if (is_calculable(succ, calculated_ids))
				new_calculable_ids.add(s);
		}

		return new_calculable_ids;
	}

	function recurse(calculated_ids, calculable_ids, used_mem, peak_mem, indent) {
		if (calculable_ids.size==0)
			return { operations: [], used_mem, peak_mem }

		//console.log("try", indent, "calculated_ids", calculated_ids, "calculable_ids", calculable_ids, "used/peak", used_mem, peak_mem);

		var best_try = null;
		for (var try_id of calculable_ids) {
			// calculate try_id and get new state
			var try_used_mem = used_mem + grph.footprints[try_id];
			var try_peak_mem = Math.max(peak_mem, try_used_mem);
			var try_calculated_ids = new Set([try_id].concat([... calculated_ids]));
			var try_freeable_ids = get_new_freeable_ids(nodes[try_id], nodes, try_calculated_ids);
			var try_freeable_mem = try_freeable_ids.reduce((acc, node) => acc+node.footprint, 0.0);
			try_used_mem -=  try_freeable_mem;

			var try_calculable_ids = get_new_calculable_ids(try_id, try_calculated_ids, calculable_ids);
			var try_result = recurse(try_calculated_ids, try_calculable_ids, try_used_mem, try_peak_mem, indent+" ");

			if (best_try==null || best_try.peak_mem > try_result.peak_mem) {
				best_try = try_result;
				best_try.operations.unshift(try_id + " " + try_freeable_ids.join(" "));
			}
		}
		return best_try;
	}

	var calculated_ids = new Set();
	var calculable_ids = new Set(root_ids);
	var best_try = recurse(calculated_ids, calculable_ids, 0.0, 0.0, " ");

	var solution = best_try.operations.length + "\n" + best_try.operations.join("\n");
	return solution;
}


module.exports = {
    depth_first_solution,
};

