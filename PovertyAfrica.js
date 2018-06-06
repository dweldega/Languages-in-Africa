/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global d3*/

// Statics
var YEARS = ["1998", "1999", "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017"];
var POP = "Population";
var AREA = "Area";
// End statics

//Define Margin
var margin = {left: 80, right: 80, top: 50, bottom: 50 }, 
    width = 1000 - margin.left -margin.right,
    height = 500 - margin.top - margin.bottom,
    scaleWidth=width + margin.left + margin.right,
    scaleHeight=50;

//Define SVG
var svg = d3.select(".svgContainer").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

var legendCont = d3.select(".legend-container").append("svg")
    .attr("width", 200)
    .attr("height", 400);
    
// Define the scales
var scaleX = d3.scaleLinear()
    .domain([-25,0]) // Give appropriate range in the scale
    .range([0,width]);

var scaleY = d3.scaleLinear()
    .domain([50, 70]) // Give appropriate range in the scale
    .range([height, 0]);

var scaleColor = d3.scaleLinear()
    .range(['#ffebe6', 'red']);

var projection = d3.geoMercator()
    .scale(300)
    .center([18, 1])
    .translate([width / 2, height / 2]);

var path = d3.geoPath()
    .projection(projection);


// We are going to store all the data on countries in a dictionary of dictionaries
// So population is going to be countryData['Country']['Population'] = [1,2,3,...]
var countryData = {};

function AfricaPopulation(data) {
    data.forEach(function(d) {
        countryData[d.Country] = {}
        
        // Load the population data into an array for saving
        var pop = [];
        for(var i = 0; i < YEARS.length; ++i) {
            pop.push(+d[YEARS[i]])
        }
        countryData[d.Country][POP] = pop;
    });
}

function AfricaArea(data) {
    data.forEach(function(d) {
        // If we have found a country that wasn't in the list before, initialize the dictionary
        if(!(d.Country in countryData)) {
            countryData[d.Country] = {}
            countryData[d.Country][POP] = [];
        }
        
        // The /,/g replaces all commas with blanks
        countryData[d.Country][AREA] = +(d.Area.replace(/,/g, ""));
    });
}


// Load the geojson data and draw it
function GeoAfrica(data) {
    var features = data.features;
    
    
    // Set the color scales
    var domains = []
    for(var country in countryData) {
        domains.push([d3.min(countryData[country][POP]), d3.max(countryData[country][POP])]);
    }

    scaleColor.domain([d3.min(domains, function(d) { return d[0]; }), d3.max(domains, function(d) { return d[1]; })]);
        
    // Draw each province as a path
    // Taken from http://bl.ocks.org/almccon/fe445f1d6b177fd0946800a48aa59c71
    svg.selectAll('path')
        .data(features)
        .enter().append('path')
        .attr('d', path)
        .attr("fill", function(d) { return countryFill(d.properties.brk_name); })
        .attr("stroke","black")
        .attr("stroke-width", 1);
        
        
        
	var colorPopulation = d3.scaleThreshold()
		.domain([1,3,5,7])    
		.range(["rgb(78,179,211)","rgb(43,140,190)","rgb(8,88,158)","rgb(116,169,207)","rgb(12,44,132)"]);
		//https://github.com/d3/d3-scale-chromatic
	
	var popLegend = d3.legendColor()
		.labelFormat(d3.format(".2f"))
		.labels(d3.legendHelpers.thresholdLabels).title("Population")
		.scale(scaleColor);
	
	legendCont.append("g")
		.call(popLegend)
		.attr("class", "legendQuant")
		.attr("transform", "translate(20,40)");
	
    
}

d3.queue()
    .defer(d3.csv, "data/AfricaPopulation.csv")
    .defer(d3.csv, "data/AfricaArea.csv")
    .defer(d3.json, "data/GeoAfrica.json")
    .await(function(error, csvAfricaPopulation, csvAfricaArea, jsonAfrica) {
        if(error) { console.error(error); }
        else {
            // This is after all the csv files have been loaded, so call the processing functions
            AfricaPopulation(csvAfricaPopulation);
            AfricaArea(csvAfricaArea);
            GeoAfrica(jsonAfrica); // This one should be last
            // Now all the files have been processed, we can actually use the data now
        }
    });


function countryFill(name) {
    if(!(name in countryData)) {
//        console.log("Missing " + name);
        return "#ebebe0";
    }
    
    var popDensity = countryData[name][POP][0] / countryData[name][AREA];
    
    var scaleVariable = scaleColor(countryData[name][POP][0]);
    
    return scaleVariable;
}
