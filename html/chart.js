const graphDiv = document.getElementById("graph-container");


// const svg = d3.select("#graph-container").append("svg")
//   .attr("width", diameter + margin.left + margin.right)
//   .attr("height", diameter + margin.top + margin.bottom)

// let context = svg.append("g")
//   .attr("class", "context")
//   .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

// var links_group = context.append("g").attr("class", "links"),
//     nodes_group = context.append("g").attr("class", "nodes"),
//     bills_group = context.append("g").attr("class", "bills");


var data = [[120, ["like", "call response", "dramatic intro", "has breaks", "male vocalist", "silly", "swing"]], [150, ["brassy", "like", "calm energy", "female vocalist", "swing", "fun"]], [170, ["calm energy", "instrumental", "swing", "like", "happy"]], [140, ["has breaks", "male vocalist", "swing", "piano", "banjo", "chill"]], [160, ["calm energy", "instrumental", "swing", "like", "interesting"]], [140, ["brassy", "like", "energy", "dramatic intro", "male vocalist", "baseball", "swing"]], [170, ["instrumental", "interesting", "high energy", "like", "swing"]], [140, ["instrumental", "energy", "like", "swing"]], [200, ["instrumental", "brassy", "dramatic intro", "like", "swing"]], [160, ["male vocalist", "brassy", "swing", "like", "my favorites"]], [130, ["like", "interesting", "dramatic intro", "male vocalist", "silly", "swing", "gospel"]], [160, ["like", "long intro", "announcer", "energy", "swing", "female vocalist"]], [170, ["instrumental", "swing", "bass", "like"]], [150, ["like", "interesting", "has breaks", "instrumental", "chunky", "swing", "banjo", "trumpet"]], [170, ["like", "has breaks", "male vocalist", "silly", "swing", "banjo"]], [190, ["instrumental", "banjo", "swing"]], [130, ["instrumental", "brassy", "banjo", "like", "swing"]], [160, ["brassy", "like", "energy", "instrumental", "big band", "jam", "swing"]], [150, ["like", "male vocalist", "live", "swing", "piano", "banjo", "chill"]], [150, ["like", "trick ending", "instrumental", "chunky", "swing", "chill"]], [120, ["brassy", "like", "female vocalist", "swing", "chill", "energy buildup"]], [150, ["brassy", "like", "interesting", "instrumental", "swing", "piano"]], [190, ["brassy", "like", "long intro", "energy", "baseball", "swing", "female vocalist"]], [180, ["calm energy", "female vocalist", "live", "like", "swing"]], [200, ["banjo", "like", "long intro", "interesting", "energy", "my favorites", "male vocalist", "silly", "swing", "fun", "balboa"]], [150, ["brassy", "calm energy", "chunky", "instrumental", "old-timey", "live", "swing"]], [160, ["like", "call response", "interesting", "instrumental", "calm energy", "swing"]], [180, ["interesting", "swing", "fast", "male vocalist"]], [150, ["calm energy", "chunky", "swing", "female vocalist", "like"]], [180, ["like", "has breaks", "male vocalist", "chunky", "silly", "swing"]], [140, ["instrumental", "brassy", "dramatic intro", "swing", "chill"]], [150, ["male vocalist", "trumpet", "like", "swing"]], [150, ["instrumental", "energy", "like", "has breaks", "swing"]], [180, ["brassy", "like", "energy", "has breaks", "instrumental", "has calm", "swing"]], [150, ["female vocalist", "swing"]], [170, ["instrumental", "brassy", "energy", "swing"]], [170, ["calm energy", "instrumental", "energy", "like", "swing"]], [190, ["brassy", "like", "instrumental", "high energy", "swing", "trumpet"]], [160, ["male vocalist", "energy", "swing", "old-timey"]], [170, ["like", "oldies", "my favorites", "fast", "male vocalist", "high energy", "swing"]]];

// transform the data into a useful representation
// 1 is inner, 2, is outer

// need: inner, outer, links
//
// inner:
// links: { inner: outer: }


var diameter = 950;
var rect_width = 100;
var rect_height_margin = diameter / 65;
var rect_height = rect_height_margin - 2;

var link_width = "1px";
var link_color = "#dddddd";
var link_width_hover = "3px";
var link_color_hover = "#444444";
var rect_color = "#dddddd";



var outer = d3.map();
var inner = [];
var links = [];

var outerId = [0];

data.forEach(function(d){
  if (d == null)
    return;

  i = { id: 'i' + inner.length, name: d[0], related_links: [] };
  i.related_nodes = [i.id];
  inner.push(i);

  if (!Array.isArray(d[1]))
    d[1] = [d[1]];

  d[1].forEach(function(d1){

    o = outer.get(d1);

    if (o == null)
    {
      o = { name: d1, id: 'o' + outerId[0], related_links: [] };
      o.related_nodes = [o.id];
      outerId[0] = outerId[0] + 1;

      outer.set(d1, o);
    }

    // create the links
    l = { id: 'l-' + i.id + '-' + o.id, inner: i, outer: o }
    links.push(l);

    // and the relationships
    i.related_nodes.push(o.id);
    i.related_links.push(l.id);
    o.related_nodes.push(i.id);
    o.related_links.push(l.id);
  });
});

data = {
  inner: inner,
  outer: outer.values(),
  links: links
}

// sort the data -- TODO: have multiple sort options
outer = data.outer;
data.outer = Array(outer.length);


var i1 = 0;
var i2 = outer.length - 1;

for (var i = 0; i < data.outer.length; ++i)
{
  if (i % 2 == 1)
    data.outer[i2--] = outer[i];
  else
    data.outer[i1++] = outer[i];
}

console.log(data.outer.reduce(function(a,b) { return a + b.related_links.length; }, 0) / data.outer.length);


var il = data.inner.length;
var ol = data.outer.length;

var inner_y = d3.scale.linear()
    .domain([0, il])
    .range([-(il * rect_height_margin)/2, (il * rect_height_margin)/2]);

mid = (data.outer.length / 2.0)
var outer_x = d3.scale.linear()
    .domain([0, mid, mid, data.outer.length])
    .range([15, 170, 190 ,355]);

var outer_y = d3.scale.linear()
    .domain([0, data.outer.length])
    .range([0, diameter / 2 - 120]);


// setup positioning
data.outer = data.outer.map(function(d, i) {
    d.x = outer_x(i);
    d.y = diameter/3;
    return d;
});

data.inner = data.inner.map(function(d, i) {
    d.x = -(rect_width / 2);
    d.y = inner_y(i);
    return d;
});

function projectX(x)
{
    return ((x - 90) / 180 * Math.PI) - (Math.PI/2);
}

var diagonal = d3.svg.diagonal()
    .source(function(d) { return {"x": d.outer.y * Math.cos(projectX(d.outer.x)),
                                  "y": -d.outer.y * Math.sin(projectX(d.outer.x))}; })
    .target(function(d) { return {"x": d.inner.y + rect_height_margin/2,
                                  "y": d.outer.x > 180 ? d.inner.x : d.inner.x + rect_width}; })
    .projection(function(d) { return [d.y, d.x]; });


var svg = d3.select("#graph-container").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
  .append("g")
    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");


// links
var link = svg.append('g').attr('class', 'links').selectAll(".link")
    .data(data.links)
  .enter().append('path')
    .attr('class', 'link')
    .attr('id', function(d) { return d.id })
    .attr("d", diagonal)
    .attr('stroke', '#dddddd')
    .attr('stroke-width', link_width);

// outer nodes

var onode = svg.append('g').selectAll(".outer_node")
    .data(data.outer)
  .enter().append("g")
    .attr("class", "outer_node")
    .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    .on("mouseover", mouseover)
    .on("mouseout", mouseout);

onode.append("circle")
    .attr('id', function(d) { return d.id })
    .attr("r", 4.5);

onode.append("circle")
    .attr('r', 20)
    .attr('visibility', 'hidden');

onode.append("text")
  .attr('id', function(d) { return d.id + '-txt'; })
    .attr("dy", ".31em")
    .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
    .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
    .text(function(d) { return d.name; });

// inner nodes

var inode = svg.append('g').selectAll(".inner_node")
    .data(data.inner)
  .enter().append("g")
    .attr("class", "inner_node")
    .attr("transform", function(d, i) { return "translate(" + d.x + "," + d.y + ")"})
    .on("mouseover", mouseover)
    .on("mouseout", mouseout);

inode.append('rect')
    .attr('width', rect_width)
    .attr('height', rect_height)
    .attr('id', function(d) { return d.id; })
    .attr('fill', rect_color);

inode.append("text")
  .attr('id', function(d) { return d.id + '-txt'; })
    .attr('text-anchor', 'middle')
    .attr("transform", "translate(" + rect_width/2 + ", " + rect_height * .75 + ")")
    .text(function(d) { return d.name; });

// need to specify x/y/etc

d3.select(self.frameElement).style("height", diameter - 150 + "px");

function mouseover(d)
{
  // bring to front
  d3.selectAll('.links .link').sort(function(a, b){ return d.related_links.indexOf(a.id); });

    for (var i = 0; i < d.related_nodes.length; i++)
    {
        d3.select('#' + d.related_nodes[i]).classed('highlight', true);
        d3.select('#' + d.related_nodes[i] + '-txt').attr("font-weight", 'bold');
    }

    for (var i = 0; i < d.related_links.length; i++)
        d3.select('#' + d.related_links[i])
          .attr('stroke-width', link_width_hover)
          .attr('stroke', link_color_hover);
}

function mouseout(d)
{
    for (var i = 0; i < d.related_nodes.length; i++)
    {
        d3.select('#' + d.related_nodes[i]).classed('highlight', false);
        d3.select('#' + d.related_nodes[i] + '-txt').attr("font-weight", 'normal');
    }

    for (var i = 0; i < d.related_links.length; i++)
        d3.select('#' + d.related_links[i])
          .attr('stroke-width', link_width)
          .attr('stroke', link_color);
}