
var users = {}, user_list = [];
var problems = {}, problem_list = [];;

var db = "code-contest/.code-contest/db.sqlite";

function init() { 	
	$.get("/sqlite_exec?db="+db+"&stmt=select * from participants")
	.then(data => {
		data.forEach(x => { users[x.user_id] = x.user_name; });
		user_list = Object.keys(users);
		console.log("users", users);
	})
	.then(_ => 
		$.get("/sqlite_exec?db="+db+"&stmt=select * from problems"))
	.then(data => {
		data.forEach(x => { problems[x.problem_id] = x; delete x.problem_id; });
		problem_list = Object.keys(problems);
		console.log("problems", problems);
	})
	.then(_ => {
		problem_list.forEach((pb, i) => {
			live_chart("container"+i, pb);
			live_ranksort("xanim"+i, pb);	
		})
	})
	.catch(err => console.warn(err));
}


function live_ranksort(container_id, problem_id) {
	var ranksort_update = get_ranksort_update(container_id);
	var problem_type = problems[problem_id].problem_type;
	
	var sql;
	switch (problem_type) {
		case "speed":
			sql = "select user_id, min(timestamp) as timestamp from ( "
				+ "  select user_id, attempt, min(completed) as completed, max(timestamp) as timestamp from submissions "
				+ "   where problem_id='"+problem_id+"' group by user_id, attempt "
				+ ") as T where completed=1 group by user_id order by timestamp asc";
			break;
		case "accuracy":
			sql = "select * from ( "
				+ " select * from ( "
				+ "  select user_id, attempt, count(*) as level, max(result) as result from submissions "
				+ "   where problem_id='"+problem_id+"' group by user_id, attempt "
				+ " ) as T where result not null "
				+ " order by level, result desc"
				+ ") as T2 "
				+ "GROUP BY user_id " // HAVING MAX(ROWID) "
				+ "order by level desc, result ";
			break;
		default:
			throw new Error("unsupported problem_type: "+problem_type);
	}
	
	function live_update() {
		$.get("/sqlite_exec?" + $.param({
			db: db, 
			stmt: sql
			}))
		.then(data => { 
			//console.log("live_rank_data", problem_id, data);	
			ranked_ids = data.map(x => x.user_id);
			rank_scores = data.map(x => (problem_type=="speed") 
				? new Date(excel_to_js_time(x.timestamp)).toISOString().substr(11, 8) 
				: "level "+x.level+", error "+x.result );
			ranksort_update(ranked_ids, rank_scores);

			setTimeout(live_update, 1000);
		}).
		catch(err => {
			console.warn("live_rank_data: "+(err.stack||err));
			setTimeout(live_update, 8000);
		});
	}
	live_update();
}

function get_ranksort_update(container_id) {
	var rankDiv = document.getElementById(container_id);
	
	function ranksort_update(ranked_ids, rank_scores) { 
		// append if missing
		ranked_ids.forEach(id => {
			var rankBox = document.getElementById(container_id+"_"+id);
			if (!rankBox)
				$(rankDiv).append($('<span id="'+container_id+"_"+id+'" class="rankbox"><span class="prettybox">'+id+'</span> <span id="'+container_id+"_"+id+'_score"></span></span>'));
			rankBox = document.getElementById(container_id+"_"+id);
			rankBox.style.top = 0+'px';
		});
		// position 
		var rankBoxes = rankDiv.querySelectorAll('span'),
			rankBoxHeight = rankBoxes.length==0 ? 0 : rankBoxes[0].offsetHeight+5;
		ranked_ids.forEach((id, i) => {
			var rankBox = document.getElementById(container_id+"_"+id);
			rankBox.style.position = 'absolute';
			rankBox.style.top = i*rankBoxHeight+'px';
			
			var scoreBox = document.getElementById(container_id+"_"+id+"_score");
			scoreBox.innerText = rank_scores[i] || "-";
		});
	}
	return ranksort_update;
}

function shuffle(v) {
	var n = v.length;
	for (var i=0; i<n; i++) {
		var p = Math.floor(n*Math.random());
		var vtmp = v[i];
		v[i] = v[p];
		v[p] = vtmp;
	}
	return v;
}

function test() {
	var ranksort = ranksort_init();
	var nbBoxes = document.getElementById('xanim').querySelectorAll('#xanim>span').length;
	var pos = shuffle(new Array(nbBoxes).fill(null).map((x, i) =>i))
	ranksort(pos);
}

function get_table_update(container_id) {
	var div = document.getElementById(container_id);
	var hot_data = [];
	var hot = new Handsontable(container, {
		  data: hot_data,
		  rowHeaders: true,
		  colHeaders: true
	});

	function table_update(data) { 
		for (var i=0; i<data.length; i++)
			hot_data[i] = data[i];
		hot_data.splice(i); // e.g. clear remaining
	}
	return table_update;
}


function live_chart(container, problem_id) {
	var chart;
	var offset = 0, limit = 7; // database progressive read
	
	var series = user_list.map(user => ({ name: user, data: [] }));
	chart = Highcharts.chart(container, {
        chart: {
            type: 'line',
            events: {
                load: requestLiveData
            }
        },
        credits: { enabled: false },
        title: {
            text: problem_id + ' live data (' + problems[problem_id].problem_type + ')'

        },
        plotOptions: {
        	line: {
        		marker: { enabled: true}
        	}	
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,
            maxZoom: 20 * 1000
        },
        yAxis: {
            minPadding: 0.2,
            maxPadding: 0.2,
            title: {
                text: 'Value',
                //margin: 20
            }
        },
        series: series
    });       

	var prev_attempts = {};		
	function requestLiveData() {
		$.get("/sqlite_exec?" + $.param({
				db: db, 
				stmt: "select * from submissions "
					+ " where problem_id='"+problem_id+"' "
					+ " limit "+limit+" offset "+offset, 
				//args: [ problem_id ] 
				}))
		.then(data => { 
			limit = 1;

			//console.log("live_chart_data:", (new Date()).toISOString(), "new data:", data);
			offset += data.length;

			for (var x of data) {
				var serieId = user_list.indexOf(x.user_id);
				if (serieId==-1)
					continue;
				x.timestamp = excel_to_js_time(x.timestamp);
				if (prev_attempts[x.user_id]!==undefined && prev_attempts[x.user_id]!==x.attempt) 
					appendData(serieId, [ x.timestamp-100, null ]);	
				prev_attempts[x.user_id] = x.attempt;

				var point = [ x.timestamp, x.result ];
				appendData(serieId, point);
			}

			// call it again after one second
			setTimeout(requestLiveData, 1000);    
		})
		.catch(err => {
			console.warn("live_chart_data: "+(err.stack||err));
			setTimeout(requestLiveData, 8000);
		});
	}
	
	function requestRandomData() {
		if (chart) {
			var id = Math.floor(chart.series.length*Math.random());
			var data = chart.series[id].data
			var prev = data.length ? data[data.length-1].y : 0.0;
			var next = prev += Math.random()-0.5;
			appendData(id, [ Date.now().valueOf(), next ]);
		}		
		
		// call it again after one second
		setTimeout(requestRandomData, 1000);  
	}
	
	function appendData(serieId, point) {
		var series = chart.series[serieId],
			// shift if the series is longer than 60
			shift = false; //series.data.length > 200; 

		// add the point
		var redraw = true;
		chart.series[serieId].addPoint(point, redraw, shift);
	}
}

function excel_to_js_time(xt) {
	if (xt<100000) 
		return new Date(1899,11,30).getTime() + xt * 86400000;
	else
		return xt;
}