/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global d3*/

//Define Margin
var margin = {left: 80, right: 80, top: 50, bottom: 50 }, 
    width = 960 - margin.left -margin.right,
    height = 500 - margin.top - margin.bottom,
    scaleWidth=width + margin.left + margin.right,
    scaleHeight=50;

//Define SVG
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

var scaleX = d3.scaleLinear()
    .domain([-25,0]) // Give appropriate range in the scale
    .range([0,width]);

var scaleY = d3.scaleLinear()
    .domain([50, 70]) // Give appropriate range in the scale
    .range([height, 0]);

var projection = d3.geoMercator()
    .scale(300)
    .center([40, 9])
    .translate([width / 2, height / 2]);

var path = d3.geoPath()
    .projection(projection);


d3.json("GeoAfrica.json", function(data) {
    var features = data.features;
    
    scaleX.domain([d3.min(features, function(d) { if(d.geometry == null) { return Infinity;  } else { return d.geometry.coordinates[0][0][0]; } }),
                   d3.max(features, function(d) { if(d.geometry == null) { return -Infinity; } else { return d.geometry.coordinates[0][0][0]; } })]);
    scaleY.domain([d3.min(features, function(d) { if(d.geometry == null) { return -Infinity; } else { return d.geometry.coordinates[0][0][1]; } }), 
                   d3.max(features, function(d) { if(d.geometry == null) { return Infinity;  } else { return d.geometry.coordinates[0][0][1]; } })]);
    
    // Draw each province as a path
    // Taken from http://bl.ocks.org/almccon/fe445f1d6b177fd0946800a48aa59c71
    svg.selectAll('path')
        .data(features)
        .enter().append('path')
        .attr('d', path)
        .attr("fill", "#FFF")
        .attr("stroke","black")
        .attr("stroke-width", 1)
});
