var margin = {top: 20, right: 80, bottom: 30, left: 50},
    width = 700 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


var parseDate = d3.time.format("%Y").parse;

var x = d3.time.scale()
    .range([0,width]);
    
var y = d3.scale.linear()
    .range([height,0]);

var color = d3.scale.category10();

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.YEAR); })
    .y(function(d) { return y(d.VALUE); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    // add the tooltip area to the webpage
        var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

d3.csv("http://www.sfu.ca/~etc3/data.csv", function(error, data) {

   
   color.domain(d3.keys(data[0]).filter(function(key) { return key == "CAUSES"; }));
   
// first we need to corerce the data into the right formats

  data = data.map( function (d) { 
    return { 
      CAUSES: d.CAUSES,
      YEAR: parseDate(d.YEAR.toString()),
      VALUE: +d.VALUE }; 
});   
  
  
// then we need to nest the data on CAUSES since we want to only draw one
// line per CAUSES
  data = d3.nest().key(function(d) { return d.CAUSES; }).entries(data);


  x.domain([d3.min(data, function(d) { return d3.min(d.values, function (d) { return d.YEAR; }); }),
             d3.max(data, function(d) { return d3.max(d.values, function (d) { return d.YEAR; }); })]);
  y.domain([0, d3.max(data, function(d) { return d3.max(d.values, function (d) { return d.VALUE; }); })]);
    
  // var path1 = svg.append("g").append("path").data([data1]).attr("class", "line1");

                                                                                   
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  var causation = svg.selectAll(".CAUSES")
      .data(data, function(d) { return d.key; })
    .enter().append("g")
      .attr("class", "CAUSES");

  causation.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d) { return color(d.key); });
    
svg.append("path") // this is the black vertical line to follow mouse
  .attr("class","mouseLine")  
  .style("stroke","black")
  .style("stroke-width", "1px")
  .style("opacity", "0");

var mouseCircle = causation.append("g") // for each line, add group to hold text and circle
      .attr("class","mouseCircle"); 
    
mouseCircle.append("circle") // add a circle to follow along path
  .attr("r", 7)
  .style("stroke", function(d) { console.log(d); return color(d.key); })
  .style("fill","none")
  .style("stroke-width", "1px"); 

mouseCircle.append("text")
  .attr("transform", "translate(10,3)"); // text to hold coordinates

var bisect = d3.bisector(function(d) { return d.YEAR; }).right; // reusable bisect to find points before/after line

svg.append('svg:rect') // append a rect to catch mouse movements on canvas
  .attr('width', width) // can't catch mouse events on a g element
  .attr('height', height)
  .attr('fill', 'none')
  .attr('pointer-events', 'all')
  .on('mouseout', function(){ // on mouse out hide line, circles and text
		d3.select(".mouseLine")
			.style("opacity", "0");
		d3.selectAll(".mouseCircle circle")
			.style("opacity", "0");
	  d3.selectAll(".mouseCircle text")
			.style("opacity", "0");
  })
  .on('mouseover', function(){ // on mouse in show line, circles and text
		d3.select(".mouseLine")
			.style("opacity", "1");
		 d3.selectAll(".mouseCircle circle")
			.style("opacity", "1");
		d3.selectAll(".mouseCircle text")
			.style("opacity", "1");
  })
  .on('mousemove', function() { // mouse moving over canvas
	  d3.select(".mouseLine")
	  .attr("d", function(){
		  yRange = y.range(); // range of y axis
		  var xCoor = d3.mouse(this)[0]; // mouse position in x
		  var xDate = x.invert(xCoor); // date corresponding to mouse x 
		  d3.selectAll('.mouseCircle') // for each circle group
			  .each(function(d,i){
				 var rightIdx = bisect(data[1].values, xDate); // find date in data that right off mouse
				 var interSect = get_line_intersection(xCoor,  // get the intersection of our vertical line and the data line
					  yRange[0], 
					  xCoor, 
					  yRange[1],
					  x(data[i].values[rightIdx-1].YEAR),
					  y(data[i].values[rightIdx-1].VALUE),
					  x(data[i].values[rightIdx].YEAR),
					  y(data[i].values[rightIdx].VALUE));
		  
			  d3.select(this) // move the circle to intersection
				  .attr('transform', 'translate(' + interSect.x + ',' + interSect.y + ')');
				  
			  d3.select(this.children[1]) // write coordinates out
				  .text(xDate.toLocaleDateString() + "," + y.invert(interSect.y).toFixed(0));

			  });

		  return "M"+ xCoor +"," + yRange[0] + "L" + xCoor + "," + yRange[1]; // position vertical line
	  });
  });  
    
});

// Returns 1 if the lines intersect, otherwise 0. In addition, if the lines 
// intersect the intersection point may be stored in the floats i_x and i_y.
function get_line_intersection(p0_x, p0_y, p1_x, p1_y, 
    p2_x, p2_y, p3_x, p3_y)
{
    var rV = {};
    var s1_x, s1_y, s2_x, s2_y;
    s1_x = p1_x - p0_x;     s1_y = p1_y - p0_y;
    s2_x = p3_x - p2_x;     s2_y = p3_y - p2_y;

    var s, t;
    s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
    t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
    {
        // Collision detected
        rV.x = p0_x + (t * s1_x);
        rV.y = p0_y + (t * s1_y);
    }

    return rV;
}
