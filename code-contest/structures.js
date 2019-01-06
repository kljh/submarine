/*
A wireframe is made of either metal, wood or concrete rod, beams or even cables if )
Sign conventions:
- If the metal bar is in traction then effort is positive, if it is in compression then effort is negative.
- If the force applied onto the wireframe structure is along the direction specified, then the force is positive, otherwise negative
*/

var wf_crane = {
		name: "Simple crane",
		vertices: [
			[ 0, 0 ],
			[ 1, 0 ],
			[ 1, 1 ],
			[ 2, 1 ]
		],
		edges: [
			[ 0, 1 ],
			[ 0, 2 ],
			[ 1, 2 ],
			[ 1, 3 ],
			[ 2, 3 ]
		],
		external_joints : [
			{ vertex: 0, direction: [ 1, 0 ] },
			{ vertex: 0, direction: [ 0, 1 ] },
			{ vertex: 1, direction: [ 0, 1 ] }
		],
		external_forces : [
			{ vertex: 3, direction_and_intensity: [ 0, -.3 ] }
		]
	};


var h = 1.5, w = 6;
var wf_eiffel_half = {
		name: "Ponte Eiffel (being built)",
		vertices: [
			[ 0, 0 ],
			[ -w, 0 ],
			[ -w, -h ],
			[ -2*w, -h ],
			[ -3*w, 0 ],
			[ -4*w, -h ],
			[ -5*w, 0 ],
			[ -2*w, -2*h ],
			[ -3*w, -3*h ],
			[ -3*w, -4*h ],
			[ -4*w, -6.5*h ],
		].map(pt => [ pt[0], pt[1]+10.0 ]),
		edges: [
			[ 0, 1 ],
			[ 0, 2 ],
			[ 1, 2 ],
			[ 1, 3 ],
			[ 2, 3 ],
			[ 1, 4 ],
			[ 3, 4 ],
			//[ 3, 5 ],
			[ 4, 5 ],
			[ 4, 6 ],
			[ 5, 6 ],
			[ 2, 7 ],
			[ 3, 7 ],
			[ 3, 8 ],
			[ 7, 8 ],
			[ 7, 9 ],
			[ 8, 9 ],
			[ 8, 10],
			[ 9, 10 ],
			[ 5, 10 ]
		],
		external_joints : [
			{ vertex: 10, direction: [ 1, 0 ] },
			{ vertex: 10, direction: [ 0, 1 ] },
			{ vertex: 0, direction: [ 0, 1 ] }
		],
		external_forces : [
			{ vertex: 7, direction_and_intensity: [ 0, -2 ] }
		]
	};

function complete_eiffel_bridge(wf) {
	wf = JSON.parse(JSON.stringify(wf));
	wf.name = "Ponte Eiffel (complete)";
	var nbV=wf.vertices.length;
	for (var i=1; i<nbV; i++) {
		var [ x, y ] = wf.vertices[i];
		wf.vertices.push([ -x, y ]);
	}
	var nbE=wf.edges.length;
	for (var i=0; i<nbE; i++) {
		var  [ vA, vB ] = wf.edges[i];
		wf.edges.push([ vA==0?0:vA+(nbV-1), vB==0?0:vB+(nbV-1) ]);
	}
	wf.edges.push([10, 20]);
	wf.external_joints[2].vertex = 20;
	wf.external_forces[0].vertex = 0;
	return wf;
}
var wf_eiffel_full = complete_eiffel_bridge(wf_eiffel_half);

var wfs = [ wf_crane, wf_eiffel_half, wf_eiffel_full ];
var wf = wf_eiffel_full; //

function struct_to_text(wf) {
	var txt = ""

	txt += "# Lines starting with '#' are ignored\n";
	txt += "# Blank lines are ignored\n";
	txt += "\n";

	txt += "# Number of vertices, elements, Unknown external faorces, Know external forces\n";
	txt += wf.vertices.length + " ";
	txt += wf.edges.length + " ";
	txt += wf.external_joints.length + " ";
	txt += wf.external_forces.length + " ";
	txt += "\n\n";

	txt += "# Vertices coordinates\n";
	wf.vertices.forEach(v => {
		txt += v[0] + " " + v[1] + "\n";
	});
	txt += "\n";

	txt += "# Elements (beam or cable) : vertices id (id is the position in the list above, starting with index 0) at both end\n";
	wf.edges.forEach(v => {
		txt += v[0] + " " + v[1] + "\n";
	});
	txt += "\n";

	txt += "# Unknow external forces  (anchoring of the structure to the ground) : vertices id and direction (unit norm)\n";
	wf.external_joints.forEach(v => {
		txt += v.vertex + "  " + v.direction[0] + " " + v.direction[1] + "\n";
	});
	txt += "\n";

	txt += "# Known external forces  (load applied to the structure) : vertices id and direction (norm of vector proportionnal to the load)\n";
	wf.external_forces.forEach(v => {
		txt += v.vertex + "  " + v.direction_and_intensity[0] + " " + v.direction_and_intensity[1] + "\n";
	});

	return txt;
}

function forces_to_text(wf, forces) {
	var txt = "# Expected output: \n"
		+ "# tension in each element (beam or cable, positive value for traction, negative value for compression)\n"
		+ "# and force in anchoring links (positive along the provided direction, negative if in the oppositie direction)\n"
		+ "# one value per line\n"
		+ forces.join("\n") + "\n";
	return txt;
}

function wireframe_test(wf, forces) {

	function build_system(wf) {
		var n = wf.vertices.length*2;
		var m = wf.edges.length + wf.external_joints.length;

		var mtx = new Array(n).fill(null).map(row => new Array(m).fill(0.0));
		var vec = new Array(n).fill(0.0);

		console.log(mtx, vec);

		wf.edges.forEach((edge, jEdge) => {
			var iA = 2*edge[0];
			var iB = 2*edge[1];
			var A = wf.vertices[edge[0]];
			var B = wf.vertices[edge[1]];
			var vAB = [ B[0]-A[0], B[1]-A[1] ];
			var lenAB = Math.sqrt(vAB[0]*vAB[0] + vAB[1]*vAB[1]);
			var uAB = [ vAB[0]/lenAB, vAB[1]/lenAB ]

			// force applied on point A along x and y axis
			mtx[iA][jEdge]   += uAB[0];
			mtx[iA+1][jEdge] += uAB[1];
			// force applied on point B along x and y axis
			mtx[iB][jEdge]   -= uAB[0];
			mtx[iB+1][jEdge] -= uAB[1];
		});

		wf.external_joints.forEach((anchor, a) => {
			var jAnchor = wf.edges.length + a;

			var iA = 2*anchor.vertex;
			var uA = anchor.direction;

			// force applied on point A along x and y axis
			mtx[iA][jAnchor]   += uA[0];
			mtx[iA+1][jAnchor] += uA[1];
		});

		wf.external_forces.forEach((force, f) => {
			var iA = 2*force.vertex;
			var vA = force.direction_and_intensity;

			// force applied on point A along x and y axis
			vec[iA]   -= vA[0];
			vec[iA+1] -= vA[1];
		});

		return { mtx, vec }
	}

	var tmp = build_system(wf);
	//console.log("build_system", tmp);

	//return new Array(tmp.mtx[0].length).fill(1.0);

	minv = mtx_inv(tmp.mtx)
	//console.log("minv", minv);

	msol = lusolve(tmp.mtx, tmp.vec);
	//console.log("msol", msol);

	return msol;
}

function build_select(wfs) {
	var select_node = document.getElementById("select_node");
	while (select_node.firstChild)
    	select_node.firstChild.remove();

	//var select_node = document.createElement("select");
	select_node;
	for (var wf of wfs) {
		var option_node = document.createElement("option");
		option_node.setAttribute("value", wf.name);
		option_node.textContent = wf.name;
		select_node.appendChild(option_node);
	}

	select_node.onchange = function (event) {
	    var wf;
	    wfs.forEach(wf => {
	    	if (wf.name!=event.target.value) return;
			var tmp = wireframe_test(wf);
			build_svg(wf, tmp);
	    });
	}
	//select_node_parent
}

function build_svg(wf, force_norms) {
	var svgdoc = document.getElementById("graphsvg")
	// var svgdoc = svgelnt.getSVGDocument();
	// var svgdoc = document.embeds["graphsvg"].getSVGDocument();
    // var svgroot = svgdoc.rootElement;

	// svgdoc.getElementById(args[i]);
	var drawGroup = svgdoc;
	var drawGroup = document.getElementById("graphsvg_cartesian")
	while (drawGroup.firstChild)
    	drawGroup.firstChild.remove();

	var bbox =  wf.vertices.reduce((acc, vertex, iVertex) => {
		var tmp = {
			min : [
				Math.min(acc.min[0], vertex[0]),
				Math.min(acc.min[1], vertex[1]) ],
			max : [
				Math.max(acc.max[0], vertex[0]),
				Math.max(acc.max[1], vertex[1]) ]
			};
		return tmp;
	}, { min: wf.vertices[0], max: wf.vertices[0] });

	var bbox_pad = (bbox.max[0] - bbox.min[0]) * 0.15;
	bbox.min[0] -= bbox_pad;
	bbox.min[1] -= bbox_pad;
	bbox.max[0] += bbox_pad;
	bbox.max[1] += bbox_pad;

	var bbox_width = bbox.max[0] - bbox.min[0];
	var bbox_height = bbox.max[1] - bbox.min[1];
	var view_box = bbox.min[0]+" "+bbox.min[1]+" "+bbox_width+" "+bbox_height;
	svgdoc.setAttribute("viewBox", view_box);

	var translate = bbox.max[1] + bbox.min[1]; // translate 2 * dist of plot center to axis
	//drawGroup.setAttribute("transform", "translate(0, 1), scale(1,-1)");
	drawGroup.setAttribute("transform", "translate(0, "+translate+"), scale(1,-1)");
	drawGroup.setAttribute("vector-effect", "non-scaling-stroke");

	var stroke_width = Math.min( bbox_width/100, 0.25 );
	//console.log("bbox", bbox, "stroke_width", stroke_width)

	function draw_rect(pad, fill_color) {
		var node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		var x = bbox.min[0]+pad,
		 	y = bbox.min[1]+pad;
		node.setAttribute("x", y);
		node.setAttribute("y", y);
		node.setAttribute("width", bbox.max[0]-bbox.min[0]-2*pad);
		node.setAttribute("height", bbox.max[1]-bbox.min[1]-2*pad);
		node.setAttribute("style", "fill:"+fill_color+";");
		drawGroup.appendChild(node);
	}
	//draw_rect(0, "black");
	//draw_rect(0.05, "orange");

	var nbE = wf.edges.length;
	wf.edges.forEach((edge, e) => {
		var A = wf.vertices[edge[0]];
		var B = wf.vertices[edge[1]];

		//var node=svgdoc.createElementNS("http://www.w3.org/2000/svg","line");
		var node = document.createElementNS("http://www.w3.org/2000/svg", "line");
		//node.setAttribute("id",id);
		//node.setAttribute("class", "geom geomPath geomLine");
		node.setAttribute("x1", A[0]); node.setAttribute("y1", A[1]);
		node.setAttribute("x2", B[0]); node.setAttribute("y2", B[1]);
		node.setAttribute("style", "stroke:lightblue; stroke-width:"+stroke_width+";");
		drawGroup.appendChild(node);

		var force_norm = force_norms[e];

		if (nbE<10) {
			var vAB = [ B[0]-A[0], B[1]-A[1] ];
			var lenAB = Math.sqrt(vAB[0]*vAB[0] + vAB[1]*vAB[1]);
			var uAB = [ vAB[0]/lenAB, vAB[1]/lenAB ].map(x => x*force_norm)
			var uBA = uAB.map(x => -x)
			add_force(A, uAB, "blue");
			add_force(B, uBA, "blue");
		}
	});

	wf.vertices.forEach((vextex) => {
		var node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		node.setAttribute("cx", vextex[0]);
		node.setAttribute("cy", vextex[1]);
		node.setAttribute("r", stroke_width);
		node.setAttribute("style","stroke-width: "+stroke_width+"; stroke:black; fill:none;");
		drawGroup.appendChild(node);
	});

	function add_force(origin, force, stroke_color) {
		var len = Math.sqrt(force[0]*force[0]+force[1]*force[1]);
		var angle = Math.acos(force[0]/len) * (force[1]>0?1:-1) * 180/Math.PI;

		var node=document.createElementNS("http://www.w3.org/2000/svg","use");
		node.setAttributeNS('http://www.w3.org/1999/xlink', "href", "#symbolForce");
		//node.setAttribute("x", origin[0]);
		//node.setAttribute("y", origin[1]);
		//node.setAttribute("transform", "scale(0.5) rotate("+angle+")");
		node.setAttribute("transform", "translate("+origin[0]+","+origin[1]+") rotate("+angle+") scale("+len+")");
		node.setAttribute("vector-effect", "non-scaling-stroke");
		node.setAttribute("style","stroke-width: "+stroke_width+"; stroke: "+stroke_color+"; fill:none;");

		/*
		var node = document.createElementNS("http://www.w3.org/2000/svg", "line");
		//node.setAttribute("id",id);
		//node.setAttribute("class", "geom geomPath geomLine");
		node.setAttribute("x1", force[0]); node.setAttribute("y1", force[1]);
		node.setAttribute("x2", force[0]); node.setAttribute("y2", force[1]);
		node.setAttribute("style", "stroke:lightblue; stroke-width:"+stroke_width+";");
		node.setAttribute("marker-end", "url(#arrow)");
		*/

		drawGroup.appendChild(node);
	};

	wf.external_joints.forEach((anchor, a) => {
		var force_norm_floor = 0.08;
		var force_norm = force_norms[wf.edges.length+a];
		if (Math.abs(force_norm)<force_norm_floor)
			force_norm = force_norm_floor;

		var origin = wf.vertices[anchor.vertex];
		var force = anchor.direction.map(x => x*force_norm);
		add_force(origin, force, force_norm==force_norm_floor ? "orange" : "orange");
	});
	wf.external_forces.forEach((force, f) => {
		var origin = wf.vertices[force.vertex];
		var force = force.direction_and_intensity;
		add_force(origin, force, "red")
	});
}

function fun_test() {
	var [ a, b, ...c ] = [ 5, 7, 9, 11 ]
	console.log("a", a)
	console.log("b", b)
	console.log("c", c)
	var { a, b, ...c } = { b: 7, a: 5, c: 9, d: 11 }
	console.log("a", a)
	console.log("b", b)
	console.log("c", c)
}

if (typeof exports !="undefined") {
	// bring some functions of numerics_ludcmp.js in this scope
	const ludcmp = require("../../vision/numerics/numerics_ludcmp.js");
	var {mtx_inv, lusolve } = ludcmp;

	//fun_test();

	var tests = [];
	for (var wf of wfs) {
		var tmp = wireframe_test(wf);
		var raw_data_in = struct_to_text(wf);
		var raw_data_out = forces_to_text(wf, tmp);
		tests.push({ struct: raw_data_in, forces: raw_data_out})
	}
	console.log(tests);

}