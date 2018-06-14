/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global d3*/

// Statics
var YEARS = ["1998", "1999", "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017"];
var POP = "Population";
var AREA = "Area";
var POP_DENS = "PopulationDensity";
var POV = "Poverty";
var GINI = "Gini";
var HDI = "HDI";
var LifeEx = "LifeExpectancy";
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
    .attr("transform", "translate(" + (margin.left-100) + "," + margin.top + ")");

var legendWidth = 400;
var legendHeight = 50;
var legendCont = svg.append("g")
    .attr("class", "legend-container")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("transform", "translate(550, -40)");

// Define the scales
var projection = d3.geoMercator()
    .scale(350)
    .center([18, 1])
    .translate([width / 2, height / 2]);

var path = d3.geoPath()
    .projection(projection);

// From https://github.com/d3/d3-scale-chromatic
// From https://bl.ocks.org/mbostock/5562380
var colorPopDens = d3.scaleThreshold()
    .domain([1, 10, 30, 70, 200, 500])
    .range(d3.schemeBlues[6]);

var colorPov = d3.scaleThreshold()
    .domain([0, 0.1, 0.3, 0.5, 0.7, 0.9, 1])
//    .domain([0, 1, 5, 10,20, 50])
    .range(d3.schemeOrRd[7]);

var colorGini = d3.scaleThreshold()
    .domain([20, 30, 40, 50, 70, 100])
    .range(d3.schemeYlOrRd[6]);

var colorHDI = d3.scaleThreshold()
    .domain([0.2, 0.3, 0.5, 0.7, 0.9])
    .range(d3.schemeRdPu[5]);

var colorLifeExpectancy = d3.scaleThreshold()
    .domain([30, 40, 50, 60, 70, 80])
    .range(d3.schemeYlGn[6]);

// The variable we're displaying on the map. Default to population density
var choice = 0;
// The current year we're displaying (this should actually probably be [0,20]
var year = 0;


function CreateLegend() {
	var curColor = null;
	
	legendCont.html("");
    var legendText = "";
    
    var x = d3.scaleSqrt();
    var decFormat = ".0f";
    
	if(choice == 0) {
		curColor = colorPov;
        x = d3.scaleLinear();
        decFormat = ".1f";
        legendText = "% of population below $1.90 a day";
    }
	else if(choice == 1) {
		curColor = colorPopDens;
        legendText = "Population per square km";
    }
    else if(choice == 2) {
        curColor = colorHDI;
        x = d3.scaleLinear();
        decFormat = ".1f";
        legendText = "Human Development Index (HDI)";
    }
    else if(choice == 3) {
        curColor = colorLifeExpectancy;
        legendText = "Life expectancy at birth";
    }
	else if(choice == 4) {
		curColor = colorGini;
    }
    
    x.range([0, legendWidth*0.95])
        .domain([curColor.domain()[0], curColor.domain()[curColor.domain().length-1]]);
	


    legendCont.selectAll("rect")
        .data(curColor.range().map(function(d) {
            d = curColor.invertExtent(d);
            if (d[0] == null) d[0] = x.domain()[0];
            if (d[1] == null) d[1] = x.domain()[1];
            return d;
        }))
        .enter().append("rect")
		.attr("height", 8)
		.attr("x", function(d) { return x(d[0]); })
		.attr("width", function(d) { return x(d[1]) - x(d[0]); })
		.attr("fill", function(d) { return curColor(d[0]); });

	legendCont.append("text")
		.attr("class", "caption")
		.attr("x", 100)
		.attr("y", 35)
        .attr("text-anchor", "start")
		.attr("fill", "#000")
		.attr("font-weight", "bold")
		.text(legendText);

	legendCont.call(d3.axisBottom(x)
		.tickSize(13)
		.tickValues(curColor.domain())
        .tickFormat(function (d) { return d3.format(decFormat)(d); }))
		.select(".domain")
		.remove();
}

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
        countryData[d.Country][AREA] = -1; // Set the default area value
    });
}

function AfricaArea(data) {
    data.forEach(function(d) {
        // If we have found a country that wasn't in the list before, initialize the dictionary
        if(!(d.Country in countryData)) {
			console.log("ERR: " + d.Country + " has area but not population data.");
            countryData[d.Country] = {}
            countryData[d.Country][POP] = [];
        }
        
        // The /,/g replaces all commas with blanks
        countryData[d.Country][AREA] = +(d.Area.replace(/,/g, ""));
    });
}

// Preprocess and calculate the population density
function AfricaPopulationDensity() {
	for(var country in countryData) {
		// If the population and area data doesn't exist assign the no data available
		if(countryData[country][POP].length == 0 || countryData[country][AREA] == -1) {
			countryData[country][POP_DENS] = -1;
		}
		else { // We have the data necessary, so calculate population density
			// Init the array
			var popDens = [];
			
			for(var i = 0; i < YEARS.length; ++i) {
				popDens.push(countryData[country][POP][i] / countryData[country][AREA]);
			}
			
			countryData[country][POP_DENS] = popDens;
		}
	}
}

function AfricaPoverty(data) {
	data.forEach(function(d) {
		// Load the population data into an array for saving
        var pov = [];
        for(var i = 0; i < YEARS.length; ++i) {
            if(d[YEARS[i]] != "..")
				pov.push((+d[YEARS[i]]*1000000) / countryData[d.Country][POP][i]);
			else
				pov.push(-1);
        }
        countryData[d.Country][POV] = pov;
    });
}

function AfricaGini(data) {
	data.forEach(function(d) {
		// Load the population data into an array for saving
        var gini = [];
        for(var i = 0; i < YEARS.length; ++i) {
            if(d[YEARS[i]] != "..")
				gini.push(+d[YEARS[i]])
			else
				gini.push(-1);
        }
        countryData[d.Country][GINI] = gini;
    });
}

function AfricaHDI(data) {
    data.forEach(function(d) {
        var cou = d.Country.trim();
        if(cou in countryData) {
            // Load the population data into an array for saving
            var hdi = [];
            for(var i = 0; i < YEARS.length; ++i) {
                if(d[YEARS[i]] != ".." && d[YEARS[i]] != "")
                    hdi.push(+d[YEARS[i]])
                else
                    hdi.push(-1);
            }
            countryData[cou][HDI] = hdi;
        }
    });
}

function AfricaLifeExpectancy(data) {
    data.forEach(function(d) {
        var cou = d.Country.trim();
        if(cou in countryData) {
            // Load the population data into an array for saving
            var le = [];
            for(var i = 0; i < YEARS.length; ++i) {
                if(d[YEARS[i]] != ".." && d[YEARS[i]] != "")
                    le.push(+d[YEARS[i]])
                else
                    le.push(-1);
            }
            countryData[cou][LifeEx] = le;
        }
    });
}

// Save the geoJson data so we can use it later without re-reading the file
var geoData = null;
// Load the geojson data and draw it
function GeoAfrica(data) {
    var features = data.features;
    geoData = data;
        
    // Draw each province as a path
    // Taken from http://bl.ocks.org/almccon/fe445f1d6b177fd0946800a48aa59c71
    svg.selectAll('path')
        .data(features)
        .enter().append('path')
        .attr('d', path)
        .attr("fill", function(d) { return countryFill(d.properties.brk_name); })
        .attr("stroke","black")
        .attr("stroke-width", 1)
        .on("mouseover", function(d) {
					var Country = d.properties.brk_name;
                    //Update the tooltip position and value
                    var fNonPop = d3.format(".2f");
                    var fPop = d3.format(",.0f");
                    
                    var pop = fPop(countryData[Country][POP][year]);
                    var pov = 0;
                    var hdi = 0;
                    var lifeEx = 0;
                    var gini = 0;
                    var popDens = fNonPop(countryData[Country][POP_DENS][year]);
                    
                    if(POV in countryData[Country] && countryData[Country][POV][year] != -1)
						pov = fPop(countryData[Country][POV][year]*100) + "%";
					else
						pov = "N/A";
						
					if(HDI in countryData[Country] && countryData[Country][HDI][year] != -1)
						hdi = fNonPop(countryData[Country][HDI][year]);
                    else
						hdi = "N/A";
						
                    if(LifeEx in countryData[Country] && countryData[Country][LifeEx][year] != -1)
						lifeEx = fNonPop(countryData[Country][LifeEx][year]);
					else
						lifeEx = "N/A";
					
					if(GINI in countryData[Country] && countryData[Country][GINI][year] != -1)
						gini = fNonPop(countryData[Country][GINI][year]);
					else
						gini = "N/A";
						
					d3.select("#ttCountry").html(Country);
                    d3.select("#ttPop").html(pop);
					d3.select("#ttPov").html(pov);
					d3.select("#ttHDI").html(hdi);
					d3.select("#ttLifeEx").html(lifeEx);
					d3.select("#ttGini").html(gini);
                    d3.select("#ttPopDens").html(popDens);
					
                    //Show the tooltip
                    d3.select(".staticTooltip").classed("hidden", false);
               })
               .on("mouseout", function() {
                    //Hide the tooltip
                    d3.select(".staticTooltip").classed("hidden", true);
               });            
                
}


d3.queue()
    .defer(d3.csv, "AfricaPopulation.csv")
    .defer(d3.csv, "AfricaArea.csv")
    .defer(d3.csv, "NumberOfPoor.csv")
    .defer(d3.csv, "GiniData.csv")
    .defer(d3.csv, "HDI.csv")
    .defer(d3.csv, "LifeExpectancy.csv")
    .defer(d3.json, "GeoAfrica.json")
    .await(function(error, csvAfricaPopulation, csvAfricaArea, csvNumberOfPoor, csvGini, csvHDI, csvLifeExpect, jsonAfrica) {
        if(error) { console.error(error); }
        else {
            // This is after all the csv files have been loaded, so call the processing functions
            AfricaPopulation(csvAfricaPopulation);
            AfricaArea(csvAfricaArea);
            AfricaPopulationDensity();
            AfricaPoverty(csvNumberOfPoor);
            AfricaHDI(csvHDI);
            AfricaLifeExpectancy(csvLifeExpect);
            AfricaGini(csvGini);
            
            CreateLegend();
            GeoAfrica(jsonAfrica); // This one should be last
            // Now all the files have been processed, we can actually use the data now
        }
});

d3.selectAll("input[type=radio]").on("change", function(){
    choice = this.value;
    // Redraw the map to update the colors and values
    updateGeoAfrica(geoData);
    CreateLegend();
});

d3.selectAll("input[type=range]").on("change", function() {
	year = this.value;
	updateGeoAfrica(geoData);
});
d3.selectAll("input[type=range]").on("input", function() {
	year = this.value;
	updateGeoAfrica(geoData);
});



function countryFill(name) {
	var NO_DATA = "#ebebe0";
	
    if(!(name in countryData)) {
        //console.log("Missing " + name);
        return NO_DATA;
    }
    var scaleVariable = null;
    
    if(choice == 0) { // Poverty rate
		if(countryData[name][POV] == null || countryData[name][POV][year] == -1) {
			//console.log("ERR: POV undefined for " + name);
			return NO_DATA;
		}
		else {
			scaleVariable = colorPov(countryData[name][POV][year]);
		}
	}
    else if(choice == 1) { // Population density
		if(countryData[name][POP_DENS][year] == -1) {
			return NO_DATA;
		}
		else {
			scaleVariable = colorPopDens(countryData[name][POP_DENS][year]);
		}
    }
    else if(choice == 2) { // HDI
        if(!(HDI in countryData[name]) || countryData[name][HDI][year] == -1) {
			return NO_DATA;
		}
		else {
			scaleVariable = colorHDI(countryData[name][HDI][year]);
		}
    }
    else if(choice == 3) { // Life Expectancy
        if(!(LifeEx in countryData[name]) || countryData[name][LifeEx][year] == -1) {
			return NO_DATA;
		}
		else {
			scaleVariable = colorLifeExpectancy(countryData[name][LifeEx][year]);
		}
    }
	else if(choice == 4) { // Gini coefficient
		if(countryData[name][GINI] == null || countryData[name][GINI][year] == -1) {
			return NO_DATA;
		}
		else {
			scaleVariable = colorGini(countryData[name][GINI][year]);
		}
    }
    
    return scaleVariable;
}



// Updates happen here onwards
function updateGeoAfrica() {
    // Draw each province as a path
    svg.selectAll('path')
        .attr("fill", function(d) { return countryFill(d.properties.brk_name); });
    d3.select(".yearVal").html(YEARS[year]);

}

function resetSlider() {
    year=0;
    document.getElementById("update");
    document.getElementById("reset").value = 0;
}


