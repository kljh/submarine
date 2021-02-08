$(function() {
    const OPEN_WEATHER_MAP_API_KEY = "b6efeda570e765a4dea1e3cf6471df6c";
    // const OPEN_WEATHER_MAP_API_KEY = "49d46abc291fff36299bada3d84f37f5"; // not yet active ?
    const LOCATION = "London";

    $.get(`https://api.openweathermap.org/data/2.5/weather?q=${LOCATION}&appid=${OPEN_WEATHER_MAP_API_KEY}&units=metric`)
    .then(data => {
        console.log(data);

        var t = new Date(data.dt*1000);
        var sunrise = new Date(data.sys.sunrise*1000).toISOString().substr(11, 5);
        var sunset  = new Date(data.sys.sunset *1000).toISOString().substr(11, 5);
        
        var t = new Date(data.dt*1000);

        var wtemp = `${data.main.temp.toFixed(0)}°C`;
        var wdetails1 = `Min ${data.main.temp_min.toFixed(0)}°C - Max ${data.main.temp_max.toFixed(0)}°C <br/>`;
        var wdetails2 = `Rise ${sunrise} Set ${sunset} <br/>`;
        var wdetails3 = `${data.main.pressure} hPa - ${data.main.humidity}% <br/>`;
        var wdetails4 = `${data.weather[0].description}<br/>`;
        var wdetails5 = `Wind ${(data.wind.speed * 1.94).toFixed(2)} knt<br/>`;
        $('#wtemp').text(wtemp);
        $('#wdetails').html(`<span style="font-size: 14px;"> ${wdetails1} ${wdetails2} </span>`);

        var iconurl = "https://openweathermap.org/img/w/" + data.weather[0].icon + ".png";
        var windir = `<div style="display: inline-block; transform: rotate(${data.wind.deg + 180}deg);">^</div>`;
        $('#wicon').attr('src', iconurl);
        $('#windir').html(windir);
        $('#wdesc').html(`<span style="font-size: 14px;"> ${wdetails5} ${wdetails3} </span>`);

        var lat = `${Math.abs(data.coord.lat).toFixed(2)}${data.coord.lat>0?" N":" S"}`;
        var lon = `${Math.abs(data.coord.lon).toFixed(2)}${data.coord.lon>0?" E":" W"}`;
        var wloc = `Weather in ${data.name} ${data.sys.country} <br/><span style="font-size: 14px;">${lat} ${lon} @ ${moment(t).fromNow()}</span>`;
        $('#wloc').html(wloc);
    });

    // new values are lpushed, so history is in reverse order
    $.get("https://kljh.herokuapp.com/memo/lrange?key=temp&start=0&stop=10080&json=true")
    .then(data => {
        var last = data[0];
        console.log(last);
        
        var t = new Date(last.timestamp)
        var htemp1 = `${last.temp.toFixed(1)}°C`;
        var hdetails1 = `Living room`;
        var htemp2 = `n/a`;
        var hdetails2 = `Not installed`;
        $('#htemp1').text(htemp1);
        $('#hdetails1').text(hdetails1);
        $('#htemp2').text(htemp2);
        $('#hdetails2').text(hdetails2);
       
        var hloc = `Indoor climate <br/><span style="font-size: 14px;">Updated ${moment(t).fromNow()}</span>`;
        $('#hloc').html(hloc);

        plot_temp(data);
    });

})

function plot_temp(data) {
    data = data.map( pt => { return { date: new Date(pt.timestamp), value: pt.temp }; });
    
    var width = 680, height = 340;
    var margin = ({top: 20, right: 30, bottom: 30, left: 40});

    var xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))

    var yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(data.y))

    var x = d3.scaleUtc()
        .domain(d3.extent(data, d => d.date))
        .range([margin.left, width - margin.right])

    var y = d3.scaleLinear()
        //.domain([0, d3.max(data, d => d.value)]).nice()
        //.domain(d3.extent(data, d => d.value))
        .domain([d3.min(data, d => d.value) - 0.5, d3.max(data, d => d.value)]).nice()
        .range([height - margin.bottom, margin.top])

    var line = d3.line()
        .defined(d => !isNaN(d.value))
        .x(d => x(d.date))
        .y(d => y(d.value))

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

    var line = d3.line()
        .defined(d => !isNaN(d.value))
        .x(d => x(d.date))
        .y(d => y(d.value));

    svg.append("g")
      .call(xAxis);

    svg.append("g")
      .call(yAxis);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);

    var elnt = svg.node();
    $("#plot").html("");
    $("#plot").append(elnt);
}