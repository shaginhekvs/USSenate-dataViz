import * as d3 from 'd3';
import * as _ from 'underscore';
import DataFrame from 'dataframe-js';
import * as cc from 'd3-svg-legend';
import * as chartjs from 'chart.js'

require("./main.css");

//////////////////////////////////////////////////////////
// Initial data
//////////////////////////////////////////////////////////
let maxMinVals = {
    congress: {
        max: 14000
    },
    major: {
        max: 14000
    },
    state: {
        min: 1,
        max: 1500
    }
}

let multSelectedText = {
    major: 'All policy areas selected',
    state: 'All states selected'
}

let statesIDsToNames = {};
let unfilteredData = null;
let congressData ;
const congressToYear = {
    93: '1973-1975',
    94: '1975-1977',
    95: '1977-1979',
    96: '1979-1981',
    97: '1981-1983',
    98: '1983-1985',
    99: '1985-1987',
    100: '1987-1989',
    101: '1989-1991',
    102: '1991-1993',
    103: '1993-1995',
    104: '1995-1997',
    105: '1997-1999',
    106: '1999-2001',
    107: '2001-2003',
    108: '2003-2005',
    109: '2005-2007',
    110: '2007-2009',
    111: '2009-2011',
    112: '2011-2013',
    113: '2013-2015',
    114: '2015-2017',
    115: '2017-2019'
};

const yearToCongress = {
    '1973-1975': 93,
    '1975-1977': 94,
    '1977-1979': 95,
    '1979-1981': 96,
    '1981-1983': 97,
    '1983-1985': 98,
    '1985-1987': 99,
    '1987-1989': 100,
    '1989-1991': 101,
    '1991-1993': 102,
    '1993-1995': 103,
    '1995-1997': 104,
    '1997-1999': 105,
    '1999-2001': 106,
    '2001-2003': 107,
    '2003-2005': 108,
    '2005-2007': 109,
    '2007-2009': 110,
    '2009-2011': 111,
    '2011-2013': 112,
    '2013-2015': 113,
    '2015-2017': 114,
    '2017-2019': 115,
};

const numberCongressesDisplayed = 22;

//////////////////////////////////////////////////////////
// Initialize filters and define filtering related functions
//////////////////////////////////////////////////////////

let allValuesFilter = {
    congress: [],
    party: [],
    state: [],
    major: [],
    status: [],
};

let initialFilter = {
    congress: [],
    state: [],
    party: [],
    major: [],
    status: [],
};

let filter = {
    congress: [],
    state: [],
    party: [],
    major: [],
    status: [],
};

let storyFilters = {
    congress: ["110","110"],
    displayedCongresses: [["105","106","107","108","109","110"],
                          ["108","109","110","111","112","113"]],
    state: [null, null],
    party: [null, ["D"]],
    major: [["Defense"],["Health"]],
    status: [null, null],
    titles: ["Defense bills after September 11", "Health related bills introduced by the Democratic Party"],
    texts: [["The number of bills introduced about topics related to Defense had been decreasing from 1991 but it started increasing again after 2001.", "This period was when the September 11 attacks took place in 2001, and two years later in 2003 the Iraq War started. This increasing tendency continued until 2009."],
            ["In 2007 both congress houses changed from Republican to Democratic, resulting in an increase of bills introduced by the Democrats.", "This was especially important for Health bills, as the Affordable Care Act ('Obamacare') was signed in 2010. In 2011 the House of Representatives became majorily Republican, decreasing the number of Democratic bills."]]
};

let discoverStoryNumber = 0;

function changeFilterField(field, value) {
    if (field == 'congress') {
        if (yearToCongress[value] != filter.congress) {
            filter.congress = yearToCongress[value];
            drawPlots();
        }
    } else {
        if (value != filter[field]) {
            filter[field] = [value];
            drawPlots();
        }
    }
}

function resetFilter(field=null) {
    if (field == null) {
        Object.keys(initialFilter).forEach(key => {
            filter[key] = initialFilter[key];
        });
        d3.select('#toggle-passed').text("Showing all bills");
    }
    else if (filter[field].length != initialFilter[field].length) {
        filter[field] = initialFilter[field];
    }

    if (field == 'status')
        d3.select('#toggle-passed').text("Showing all bills");
    drawPlots();

    if (field == null || field == 'party')
        drawPartyLinks();
}

function togglePassed() {
    if (filter.status.length == 1) {
        filter.status = allValuesFilter.status;
        d3.select('#toggle-passed').text("Showing all bills");
        drawPlots();
    }
    else {
        filter.status = ['passed'];
        d3.select('#toggle-passed').text("Showing passed bills");
        drawPlots();
    }
}

function formatNumberBillsTick(label) {
    label = Math.ceil(label);
    if (label >= 1000) {
        return label/1000+'k';
    } else if (Math.floor(label) == label){
        return label;
    }
}

function computeMaximumBarPlot(count) {
    if (count < 10)
        return 10;
    const tenPower = Math.pow(10, Math.floor(Math.log10(count)));
    return tenPower * Math.ceil(count/tenPower)
}

function formatYear(number) {
    if (number % 10 == 1 && number % 100 != 11)
        return number+'st';
    else if (number % 10 == 2 && number % 100 != 12)
        return number+'nd';
    else if (number % 10 == 3 && number % 100 != 13)
        return number+'rd';
    else
        return number+'th';
}

function formatLegendLabels({
    i,
    genLength,
    generatedLabels,
    labelDelimiter
}) {
    const values = generatedLabels[i].split(labelDelimiter)
    if (i === 0)
        return "0"
    else if (i === genLength - 1)
        return formatNumberBillsTick(values[0])+" or more"
    else {
        const value0 = formatNumberBillsTick(values[0]);
        const value1 = formatNumberBillsTick(values[1]-1);
        if (value0 < value1)
            return value0+" to "+value1
        else
            return value0
    }
}

//////////////////////////////////////////////////////////
// Define colors
//////////////////////////////////////////////////////////
let wind = {};
wind.palette = function (min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#e8e5f1','#c1badb','#a899c6','#9374ad','#7e51a3','#661487'].slice(0,logRange.length))
        .domain(logRange);
    currentPaletteScale.color = paletteScale;
    return paletteScale
}

wind.gray_palette = function (min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#e8e8e8','#adadac','#9b9b9a','#858584','#6a6b69','#494b48'].slice(0,logRange.length))
        .domain(logRange);
    currentPaletteScale.gray = paletteScale;
    return paletteScale
}

wind.R_palette = function (min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#fdd6cf','#fc8472','#fb5e4a','#f0372e','#cb181d','#99000d'].slice(0,logRange.length))
        .domain(logRange);
    currentPaletteScale.color = paletteScale;
    return paletteScale
}

wind.D_palette = function (min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#dbebf4','#9ecae1','#6baed6','#4292c6','#2171b5','#084594'].slice(0,logRange.length))
        .domain(logRange);
    currentPaletteScale.color = paletteScale;
    return paletteScale
}

wind.I_palette = function (min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#edf8e9','#a1d99b','#74c476','#41ab5d','#238b45','#005a32'].slice(0,logRange.length))
        .domain(logRange);
    currentPaletteScale.color = paletteScale;
    return paletteScale
}

let colorPaletteName = 'palette';
let currentPaletteScale = {};

function computeLogRange(min, max) {
    min = Math.max(min, 1);
    const linInc = max - min;
    if (linInc >= 10) {
        if (linInc >= 20 && min >=10) {
            min = 5*Math.floor(min/5);
            max = 5*Math.ceil(max/5);
        }
        const logmin = Math.log(min);
        const logmax = Math.log(max);
        const d = (logmax - logmin) / 6;
        return [Math.round(Math.exp(logmin)), Math.round(Math.exp(logmin+1*d)),Math.round(Math.exp(logmin+2*d)),Math.round(Math.exp(logmin+3*d)),Math.round(Math.exp(logmin+4*d)),Math.round(Math.exp(logmin+5*d)),Math.round(Math.exp(logmax))];
    } else if (linInc >= 3) {
        const logmin = Math.log(min);
        const logmax = Math.log(max);
        const d = (logmax - logmin) / 3;
        return [Math.round(Math.exp(logmin)), Math.round(Math.exp(logmin+1*d)),Math.round(Math.exp(logmin+2*d)),Math.round(Math.exp(logmax))];
    } else if (linInc == 2) {
        return [min, min, max];
    } else {
        return [min, max]
    }
}

let colorPalette = {
    none_color: {
        barPlot: '#ccd1d0',
        partyIcon: '#909a99',
        map: '#ccd1d0'
    },
    palette: {
        barPlot: '#a98fc0',
        barPlotHover: '#b9adc6',
        map: '#7e51a3'
    },
    R_palette: {
        barPlot: '#e28183',
        barPlotHover: '#d5abab',
        partyIcon: '#cb181d',
        map: '#cb181d'
    },
    D_palette: {
        barPlot: '#6d9ec6',
        barPlotHover: '#a3b6c5',
        partyIcon: '#2171b5',
        map: '#2171b5'
    },
    I_palette: {
        barPlot: '#78b18a',
        barPlotHover: '#9ebca8',
        partyIcon: '#238b45',
        map: '#238b45'
    }
};

function rescaleGradients(dataDf) {
    if (dataDf.count() != 0) {
        maxMinVals.state.min = dataDf.stat.min('count');
        maxMinVals.state.max = dataDf.stat.max('count');
    }
    const maxMinDiff = maxMinVals.state.max - maxMinVals.state.min;
    if (maxMinDiff > 0 && maxMinDiff < 4) {
        maxMinVals.state.min -= 0.5;
    }
    colorPalette.none_color.gradient = wind.gray_palette(maxMinVals.state.min, maxMinVals.state.max);
    if (filter.party.length == 1)
        colorPalette[filter.party[0]+'_palette'].gradient = wind[filter.party[0]+'_palette'](maxMinVals.state.min, maxMinVals.state.max);
    else
        colorPalette.palette.gradient = wind.palette(maxMinVals.state.min, maxMinVals.state.max);
}

//////////////////////////////////////////////////////////
// Plot variables
//////////////////////////////////////////////////////////

let congressPlot = null;
let majorPlot = null;
let uStatesFinal;

//////////////////////////////////////////////////////////
// Event handlers
//////////////////////////////////////////////////////////

function onclickBarPlot(plot, filterField, evt) {
    let activeBar = plot.getElementAtEvent(evt);
    if (activeBar.length > 0) {
        activeBar = activeBar[0]._model.label;
        changeFilterField(filterField, activeBar);
    } else if (filterField == "major") {
        resetFilter(filterField);
    }
}

function onclickPartyLink(partyId, onclickColor) {
    console.log('afafs')
    changeFilterField('party', partyId);
    document.getElementById('party-' + partyId).style.backgroundColor = onclickColor;
    document.getElementById('party-' + partyId).style.color = 'black';

    allValuesFilter.party.forEach(p => {
        if (p != partyId) {
            let otherParty = document.getElementById('party-' + p);
            //otherParty.style.color = ;
            otherParty.style.backgroundColor = '';
        }
    });
}



//////////////////////////////////////////////////////////
// Plotting functions (TODO: Move to separate files!)
//////////////////////////////////////////////////////////

function drawCongressPlot(data) {
    const billsPerCongress = _.groupBy(data, bg => bg.congress);
    let plotData = {
        datasets: [{
            backgroundColor: [],
            hoverBackgroundColor: colorPalette[colorPaletteName].barPlotHover,
            label: 'Number of bills',
            data: []
        }],
        labels: []
    };


    filter.displayedCongresses.forEach(congress => {
        const bills = billsPerCongress[congress];
        if (bills != null) {
            plotData.labels.push(congressToYear[congress]);
            const numberBills = bills.map(bg => bg.count).reduce((a, b) => a + b, 0);
            plotData.datasets[0].data.push(numberBills);
        } else {
            plotData.labels.push(congressToYear[congress]);
            plotData.datasets[0].data.push(0);
        }
        const paletteName = filter.congress == congress ? colorPaletteName : 'none_color';
        plotData.datasets[0].backgroundColor
            .push(colorPalette[paletteName].barPlot);
    });

    maxMinVals.congress.max = Math.max(Math.max(...plotData.datasets[0].data), 1);

    if (congressPlot == null) {
        let ctx = document.getElementById('evolution_chart');
        ctx.onclick = (evt => onclickBarPlot(congressPlot, 'congress', evt));
        congressPlot = new chartjs.Chart(ctx, {
            type: 'bar',
            data: plotData,
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    xAxes: [{
                        gridLines: {
                            display: false
                        },
                        ticks: {
                            min: 0,
                            beginAtZero: true
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Year',
                            fontStyle : 'bold'
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            callback: label => formatNumberBillsTick(label),
                            min: 0,
                            max: computeMaximumBarPlot(maxMinVals.congress.max),
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Number of Bills',
                            fontStyle : 'bold'
                        }
                    }]
                },
                legend: {
                    display: false
                },
                tooltips: {
                    mode: 'x',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems, data) {
                            return formatYear(yearToCongress[tooltipItems[0].xLabel]) + " Congress";
                        },
                        label: function(tooltipItem, data) {
                            const billLabel = (tooltipItem.yLabel != 1 ? " Bills" : " Bill");
                            return tooltipItem.yLabel + billLabel;
                        },

                    }
                }
            }
        });
    } else {
        congressPlot.data.labels = plotData.labels;
        congressPlot.data.datasets[0].data = plotData.datasets[0].data;
        congressPlot.data.datasets[0].backgroundColor = plotData.datasets[0].backgroundColor;
        congressPlot.data.datasets[0].hoverBackgroundColor = colorPalette[colorPaletteName].barPlotHover;
        congressPlot.options.scales.yAxes[0].ticks.max = computeMaximumBarPlot(maxMinVals.congress.max);
        congressPlot.update();
    }
}

function drawMajorPlot(data) {
    const billsPerMajor = _.groupBy(data, bg => bg.major);
    let plotData = {
        datasets: [{
            backgroundColor: [],
            hoverBackgroundColor: colorPalette[colorPaletteName].barPlotHover,
            label: 'Number of bills',
            data: []
        }],
        labels: []
    };
    allValuesFilter.major.forEach(major => {
        const bills = billsPerMajor[major];
        if (bills != null) {
            plotData.labels.push(major);
            const numberBills = bills.map(bg => bg.count).reduce((a, b) => a + b, 0);
            plotData.datasets[0].data.push(numberBills);
        } else {
            plotData.labels.push(major);
            plotData.datasets[0].data.push(0);
        }
        const paletteName = filter.major.includes(major) ? colorPaletteName : 'none_color';
        plotData.datasets[0].backgroundColor
            .push(colorPalette[paletteName].barPlot);
    });

    let indexes = [];
    for(let index in plotData.datasets[0].data){indexes.push(index);}
    let sorted_indexes = indexes.sort(function(a, b){return plotData.datasets[0].data[b] - plotData.datasets[0].data[a]});

    let sorted_labels = [];
    let sorted_data = [];
    let sorted_colors = [];
    for (let index of sorted_indexes){
        sorted_data.push(plotData.datasets[0].data[parseInt(index)]);
        sorted_labels.push(plotData.labels[parseInt(index)]);
        sorted_colors.push(plotData.datasets[0].backgroundColor[parseInt(index)]);
    }
    plotData.datasets[0].data = sorted_data;
    plotData.labels = sorted_labels;
    plotData.datasets[0].backgroundColor = sorted_colors;

    if (majorPlot == null) {
        let ctx = document.getElementById('majors-plot');
        ctx.onclick = (evt => onclickBarPlot(majorPlot, 'major', evt));
        majorPlot = new chartjs.Chart(ctx, {
            type: 'horizontalBar',
            data: plotData,
            options: {
                // TODO: Find a way to avoid needing this chunk of code to "refloat" labels?
                animation: {
                    onProgress () {
                        const ctx = this.chart.ctx;
                        const meta = this.chart.controller.getDatasetMeta(0);

                        chartjs.Chart.helpers.each(meta.data.forEach((bar, index) => {
                            const label = this.data.labels[index];
                            const labelPositionX = 40;
                            const labelWidth = ctx.measureText(label).width + labelPositionX;

                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'left';
                            ctx.fillStyle = '#333';
                            ctx.fillText(label, labelPositionX, bar._model.y);
                        }));
                    }
                },
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    xAxes: [{
                        ticks: {
                            min: 0,
                            beginAtZero: true,
                            callback: label => formatNumberBillsTick(label)
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Number of Bills',
                            fontStyle : 'bold'
                        }
                    }],
                    yAxes: [{
                        gridLines: {
                            display: false
                        },
                        ticks: {
                            display: false,
                            min: 0,
                            max: computeMaximumBarPlot(maxMinVals.major.max),
                            // This puts the majors labels on top of bars
                            mirror: true,
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Subject',
                            fontStyle : 'bold'
                        }
                    }]
                },
                legend: {
                    display: false
                },
                tooltips: {
                    mode: 'y',
                    intersect: false,
                    callbacks: {
                        label: function(tooltipItem, data) {
                            const billLabel = (tooltipItem.xLabel != 1 ? " Bills" : " Bill");
                            return tooltipItem.xLabel + billLabel;
                        }
                    }
                }
            }
        });
    } else {
        majorPlot.data.labels = plotData.labels;
        majorPlot.data.datasets[0].data = plotData.datasets[0].data;
        majorPlot.data.datasets[0].backgroundColor = plotData.datasets[0].backgroundColor;
        majorPlot.data.datasets[0].hoverBackgroundColor = colorPalette[colorPaletteName].barPlotHover;
        majorPlot.options.scales.yAxes[0].ticks.max = computeMaximumBarPlot(maxMinVals.major.max);
        majorPlot.update();
    }
}

const uStatePaths = [
        {id:"HI",n:"Hawaii",d:"M233.08751,519.30948L235.02744,515.75293L237.2907,515.42961L237.61402,516.23791L235.51242,519.30948L233.08751,519.30948ZM243.27217,515.59127L249.4153,518.17784L251.51689,517.85452L253.1335,513.97465L252.48686,510.57977L248.28366,510.09479L244.24213,511.87306L243.27217,515.59127ZM273.9878,525.61427L277.706,531.11074L280.13092,530.78742L281.26255,530.30244L282.7175,531.59573L286.43571,531.43407L287.40568,529.97912L284.49577,528.20085L282.55584,524.48263L280.45424,520.92609L274.63444,523.83599L273.9878,525.61427ZM294.19545,534.50564L295.48874,532.5657L300.17691,533.53566L300.82356,533.05068L306.96668,533.69732L306.64336,534.99062L304.05678,536.44556L299.69193,536.12224L294.19545,534.50564ZM299.53027,539.67879L301.47021,543.55866L304.54176,542.42703L304.86509,540.81041L303.24848,538.70882L299.53027,538.3855L299.53027,539.67879ZM306.4817,538.54716L308.74496,535.63726L313.43313,538.06218L317.79798,539.19381L322.16284,541.94205L322.16284,543.88198L318.6063,545.66026L313.75645,546.63022L311.33154,545.17527L306.4817,538.54716ZM323.13281,554.06663L324.74942,552.77335L328.14431,554.38997L335.74238,557.94651L339.13727,560.0481L340.75387,562.47302L342.69381,566.83787L346.73534,569.42445L346.41202,570.71775L342.53215,573.95097L338.32896,575.40592L336.87401,574.75928L333.80244,576.53754L331.37753,579.77077L329.11427,582.68067L327.33599,582.51901L323.77945,579.93243L323.45613,575.40592L324.10277,572.981L322.48616,567.32286L320.38456,565.54458L320.2229,562.958L322.48616,561.98804L324.58776,558.91648L325.07274,557.94651L323.45613,556.16823L323.13281,554.06663Z"},
        {id:"AK",n:"Alaska",d:"M158.07671,453.67502L157.75339,539.03215L159.36999,540.00211L162.44156,540.16377L163.8965,539.03215L166.48308,539.03215L166.64475,541.94205L173.59618,548.73182L174.08117,551.3184L177.47605,549.37846L178.1227,549.2168L178.44602,546.14524L179.90096,544.52863L181.0326,544.36697L182.97253,542.91201L186.04409,545.01361L186.69074,547.92352L188.63067,549.05514L189.7623,551.48006L193.64218,553.25833L197.03706,559.2398L199.78529,563.11966L202.04855,565.86791L203.50351,569.58611L208.515,571.36439L213.68817,573.46598L214.65813,577.83084L215.14311,580.9024L214.17315,584.29729L212.39487,586.56054L210.77826,585.75224L209.32331,582.68067L206.57507,581.22573L204.7968,580.09409L203.98849,580.9024L205.44344,583.65065L205.6051,587.36885L204.47347,587.85383L202.53354,585.9139L200.43195,584.62061L200.91693,586.23722L202.21021,588.0155L201.40191,588.8238C201.40191,588.8238,200.59361,588.50048,200.10863,587.85383C199.62363,587.20719,198.00703,584.45895,198.00703,584.45895L197.03706,582.19569C197.03706,582.19569,196.71374,583.48898,196.06709,583.16565C195.42044,582.84233,194.7738,581.71071,194.7738,581.71071L196.55207,579.77077L195.09712,578.31582L195.09712,573.30432L194.28882,573.30432L193.48052,576.6992L192.34888,577.1842L191.37892,573.46598L190.73227,569.74777L189.92396,569.26279L190.24729,574.92094L190.24729,576.05256L188.79233,574.75928L185.23579,568.77781L183.13419,568.29283L182.48755,564.57462L180.87094,561.66472L179.25432,560.53308L179.25432,558.26983L181.35592,556.97654L180.87094,556.65322L178.28436,557.29986L174.88947,554.87495L172.30289,551.96504L167.45306,549.37846L163.41152,546.79188L164.70482,543.55866L164.70482,541.94205L162.92654,543.55866L160.01664,544.69029L156.29843,543.55866L150.64028,541.13375L145.14381,541.13375L144.49717,541.61873L138.03072,537.73885L135.92912,537.41553L133.18088,531.59573L129.62433,531.91905L126.06778,533.374L126.55277,537.90052L127.68439,534.99062L128.65437,535.31394L127.19941,539.67879L130.43263,536.93055L131.07928,538.54716L127.19941,542.91201L125.90612,542.58869L125.42114,540.64875L124.12785,539.84045L122.83456,540.97208L120.08632,539.19381L117.01475,541.29541L115.23649,543.397L111.8416,545.4986L107.15342,545.33693L106.66844,543.23534L110.38664,542.58869L110.38664,541.29541L108.12338,540.64875L109.09336,538.22384L111.35661,534.34397L111.35661,532.5657L111.51827,531.75739L115.88313,529.49413L116.85309,530.78742L119.60134,530.78742L118.30805,528.20085L114.58983,527.87752L109.57834,530.62576L107.15342,534.02064L105.37515,536.60723L104.24352,538.87049L100.04033,540.32543L96.96876,542.91201L96.645439,544.52863L98.908696,545.4986L99.717009,547.60018L96.96876,550.83341L90.502321,555.03661L82.742574,559.2398L80.640977,560.37142L75.306159,561.50306L69.971333,563.76631L71.749608,565.0596L70.294654,566.51455L69.809672,567.64618L67.061434,566.67621L63.828214,566.83787L63.019902,569.10113L62.049939,569.10113L62.37326,566.67621L58.816709,567.96951L55.90681,568.93947L52.511924,567.64618L49.602023,569.58611L46.368799,569.58611L44.267202,570.87941L42.65059,571.68771L40.548995,571.36439L37.962415,570.23276L35.699158,570.87941L34.729191,571.84937L33.112578,570.71775L33.112578,568.77781L36.184142,567.48452L42.488929,568.13117L46.853782,566.51455L48.955378,564.41296L51.86528,563.76631L53.643553,562.958L56.391794,563.11966L58.008406,564.41296L58.978369,564.08964L61.241626,561.3414L64.313196,560.37142L67.708076,559.72478L69.00137,559.40146L69.648012,559.88644L70.456324,559.88644L71.749608,556.16823L75.791141,554.71329L77.731077,550.99508L79.994336,546.46856L81.610951,545.01361L81.934272,542.42703L80.317657,543.72032L76.922764,544.36697L76.276122,541.94205L74.982838,541.61873L74.012865,542.58869L73.851205,545.4986L72.39625,545.33693L70.941306,539.51713L69.648012,540.81041L68.516388,540.32543L68.193068,538.3855L64.151535,538.54716L62.049939,539.67879L59.463361,539.35547L60.918305,537.90052L61.403286,535.31394L60.756645,533.374L62.211599,532.40404L63.504883,532.24238L62.858241,530.4641L62.858241,526.09925L61.888278,525.12928L61.079966,526.58423L54.936843,526.58423L53.481892,525.29094L52.835247,521.41108L50.733651,517.85452L50.733651,516.88456L52.835247,516.07625L52.996908,513.97465L54.128536,512.84303L53.320231,512.35805L52.026941,512.84303L50.895313,510.09479L51.86528,505.08328L56.391794,501.85007L58.978369,500.23345L60.918305,496.51525L63.666554,495.22195L66.253132,496.35359L66.576453,498.77851L69.00137,498.45517L72.23459,496.03026L73.851205,496.67691L74.821167,497.32355L76.437782,497.32355L78.701041,496.03026L79.509354,491.6654C79.509354,491.6654,79.832675,488.75551,80.479317,488.27052C81.125959,487.78554,81.44928,487.30056,81.44928,487.30056L80.317657,485.36062L77.731077,486.16893L74.497847,486.97723L72.557911,486.49225L69.00137,484.71397L63.989875,484.55231L60.433324,480.83411L60.918305,476.95424L61.564957,474.52932L59.463361,472.75105L57.523423,469.03283L58.008406,468.22453L64.798177,467.73955L66.899773,467.73955L67.869736,468.70951L68.516388,468.70951L68.354728,467.0929L72.23459,466.44626L74.821167,466.76958L76.276122,467.90121L74.821167,470.00281L74.336186,471.45775L77.084435,473.07437L82.095932,474.85264L83.874208,473.88268L81.610951,469.51783L80.640977,466.2846L81.610951,465.47629L78.21606,463.53636L77.731077,462.40472L78.21606,460.78812L77.407756,456.90825L74.497847,452.22007L72.072929,448.01688L74.982838,446.07694L78.21606,446.07694L79.994336,446.72359L84.197528,446.56193L87.915733,443.00539L89.047366,439.93382L92.765578,437.5089L94.382182,438.47887L97.130421,437.83222L100.84863,435.73062L101.98027,435.56896L102.95023,436.37728L107.47674,436.21561L110.22498,433.14405L111.35661,433.14405L114.91316,435.56896L116.85309,437.67056L116.36811,438.80219L117.01475,439.93382L118.63137,438.31721L122.51124,438.64053L122.83456,442.35873L124.7745,443.81369L131.88759,444.46033L138.19238,448.66352L139.64732,447.69356L144.82049,450.28014L146.92208,449.6335L148.86202,448.82518L153.71185,450.76512L158.07671,453.67502ZM42.973913,482.61238L45.075509,487.9472L44.913847,488.91717L42.003945,488.59384L40.225672,484.55231L38.447399,483.09737L36.02248,483.09737L35.86082,480.51078L37.639093,478.08586L38.770722,480.51078L40.225672,481.96573L42.973913,482.61238ZM40.387333,516.07625L44.105542,516.88456L47.823749,517.85452L48.632056,518.8245L47.015444,522.5427L43.94388,522.38104L40.548995,518.8245L40.387333,516.07625ZM19.694697,502.01173L20.826327,504.5983L21.957955,506.21492L20.826327,507.02322L18.72473,503.95166L18.72473,502.01173L19.694697,502.01173ZM5.9534943,575.0826L9.3483796,572.81934L12.743265,571.84937L15.329845,572.17269L15.814828,573.7893L17.754763,574.27429L19.694697,572.33436L19.371375,570.71775L22.119616,570.0711L25.029518,572.65768L23.897889,574.43595L19.533037,575.56758L16.784795,575.0826L13.066588,573.95097L8.7017347,575.40592L7.0851227,575.72924L5.9534943,575.0826ZM54.936843,570.55609L56.553455,572.49602L58.655048,570.87941L57.2001,569.58611L54.936843,570.55609ZM57.846745,573.62764L58.978369,571.36439L61.079966,571.68771L60.271663,573.62764L57.846745,573.62764ZM81.44928,571.68771L82.904234,573.46598L83.874208,572.33436L83.065895,570.39442L81.44928,571.68771ZM90.17899,559.2398L91.310623,565.0596L94.220522,565.86791L99.232017,562.958L103.59687,560.37142L101.98027,557.94651L102.46525,555.52159L100.36365,556.81488L97.453752,556.00657L99.070357,554.87495L101.01029,555.68325L104.89016,553.90497L105.37515,552.45003L102.95023,551.64172L103.75853,549.70178L101.01029,551.64172L96.322118,555.19827L91.472284,558.10817L90.17899,559.2398ZM132.53423,539.35547L134.95915,537.90052L133.98918,536.12224L132.21091,537.09221L132.53423,539.35547Z"},
        {id:"FL",n:"Florida",d:"M759.8167,439.1428L762.08236,446.4614L765.81206,456.20366L771.14685,465.57996L774.86504,471.88472L779.71486,477.38118L783.75637,481.09937L785.37297,484.00926L784.24135,485.30254L783.43305,486.59582L786.34293,494.03221L789.25282,496.94209L791.83939,502.27689L795.39592,508.09667L799.92241,516.34135L801.2157,523.93939L801.70068,535.90227L802.34732,537.68053L802.024,541.0754L799.59909,542.36869L799.92241,544.30861L799.27577,546.24854L799.59909,548.67344L800.08407,550.61337L797.33585,553.84658L794.2643,555.30152L790.38445,555.46318L788.9295,557.07979L786.5046,558.04975L785.21131,557.56477L784.07969,556.59481L783.75637,553.68492L782.94806,550.29005L779.55319,545.11691L775.99666,542.85367L772.11681,542.53035L771.30851,543.82363L768.23696,539.4588L767.59032,535.90227L765.00375,531.86076L763.22549,530.72913L761.60888,532.83072L759.83062,532.5074L757.72903,527.49592L754.81914,523.61607L751.90925,518.28128L749.32269,515.20973L745.76616,511.49154L747.86774,509.06663L751.10095,503.57017L750.93929,501.95357L746.4128,500.98361L744.79619,501.63025L745.11952,502.27689L747.70608,503.24685L746.25114,507.77335L745.44284,508.25833L743.66457,504.21682L742.37129,499.367L742.04797,496.61877L743.50291,491.93062L743.50291,482.39265L740.43136,478.67446L739.13808,475.60291L733.96494,474.30963L732.02502,473.66299L730.40841,471.07642L727.01354,469.45981L725.88192,466.06494L723.13369,465.09498L720.70878,461.37679L716.50561,459.92185L713.59572,458.4669L711.00916,458.4669L706.96764,459.27521L706.80598,461.21513L707.61429,462.18509L707.1293,463.31672L704.05776,463.15506L700.33957,466.71159L696.78303,468.65151L692.90318,468.65151L689.66997,469.9448L689.34665,467.19657L687.73005,465.25664L684.82016,464.12502L683.20356,462.67007L675.12053,458.79022L667.52249,457.01196L663.15766,457.6586L657.17622,458.14358L651.19478,460.24517L647.71554,460.85813L647.47762,452.80838L644.89105,450.86846L643.11278,449.09019L643.4361,446.01863L653.62072,444.72535L679.16312,441.81546L685.95287,441.16882L691.38887,441.44909L693.97544,445.32895L695.43038,446.78389L703.52854,447.29911L714.34829,446.65247L735.86068,445.35918L741.3064,444.68481L746.41398,444.88932L746.84081,447.79921L749.07381,448.60751L749.30875,443.97751L747.78053,439.80456L749.08893,438.36473L754.64356,438.81948L759.8167,439.1428ZM772.36211,571.54788L774.78703,570.90124L776.08031,570.65875L777.53527,568.31466L779.87935,566.69805L781.17264,567.18304L782.87008,567.50636L783.27423,568.55715L779.79853,569.76961L775.59533,571.22456L773.25125,572.43702L772.36211,571.54788ZM785.86081,566.53639L787.07327,567.58719L789.82151,565.4856L795.15632,561.28241L798.87452,557.40254L801.38027,550.77444L802.35024,549.077L802.5119,545.68212L801.78442,546.1671L800.81446,548.99617L799.3595,553.6035L796.12628,558.8575L791.76144,563.06068L788.36656,565.00061L785.86081,566.53639Z"},
        {id:"NH",n:"New Hampshire",d:"M880.79902,142.42476L881.66802,141.34826L882.75824,138.05724L880.21516,137.14377L879.73017,134.07221L875.85032,132.94059L875.527,130.19235L868.25225,106.75153L863.65083,92.208542L862.75375,92.203482L862.10711,93.820087L861.46047,93.335106L860.4905,92.365143L859.03556,94.305068L858.98709,99.337122L859.29874,105.00434L861.23866,107.75258L861.23866,111.7941L857.52046,116.85688L854.93389,117.98852L854.93389,119.12014L856.06552,120.89841L856.06552,129.46643L855.25721,138.6811L855.09555,143.53092L856.06552,144.82422L855.90386,149.35071L855.41887,151.12899L856.38768,151.83821L873.17535,147.41366L875.35022,146.81121L877.19379,144.03788L880.79902,142.42476Z"},
        {id:"MI",n:"Michigan",d:"M581.61931,82.059006L583.4483,80.001402L585.62022,79.201221L590.99286,75.314624L593.27908,74.743065L593.73634,75.200319L588.59232,80.344339L585.27728,82.287628L583.21967,83.202124L581.61931,82.059006ZM667.79369,114.18719L668.44033,116.69293L671.67355,116.85459L672.96684,115.64213C672.96684,115.64213,672.88601,114.18719,672.56269,114.02552C672.23936,113.86386,670.94608,112.16642,670.94608,112.16642L668.76366,112.40891L667.14704,112.57057L666.82372,113.7022L667.79369,114.18719ZM567.49209,111.21318L568.20837,110.63278L570.9566,109.82447L574.51313,107.56123L574.51313,106.59126L575.15978,105.94462L581.14121,104.97466L583.56612,103.03473L587.93095,100.93315L588.09261,99.639864L590.03254,96.729975L591.8108,95.921673L593.10409,94.143408L595.36733,91.880161L599.73217,89.455254L604.42032,88.970273L605.55194,90.101896L605.22862,91.071859L601.51043,92.041822L600.05549,95.113371L597.79224,95.921673L597.30726,98.34658L594.88235,101.57979L594.55903,104.16636L595.36733,104.65134L596.3373,103.51972L599.89383,100.60983L601.18711,101.90311L603.45036,101.90311L606.68357,102.87307L608.13851,104.0047L609.59345,107.07625L612.34168,109.82447L616.22153,109.66281L617.67648,108.69285L619.29308,109.98613L620.90969,110.47112L622.20297,109.66281L623.33459,109.66281L624.9512,108.69285L628.99271,105.13632L632.38758,104.0047L639.01566,103.68138L643.54215,101.74145L646.12872,100.44817L647.58367,100.60983L647.58367,106.26794L648.06865,106.59126L650.97853,107.39957L652.91846,106.91458L659.06156,105.29798L660.19318,104.16636L661.64813,104.65134L661.64813,111.60274L664.88134,114.67429L666.17462,115.32093L667.4679,116.29089L666.17462,116.61421L665.36632,116.29089L661.64813,115.80591L659.54654,116.45255L657.28329,116.29089L654.05008,117.74584L652.27182,117.74584L646.45204,116.45255L641.27891,116.61421L639.33898,119.20078L632.38758,119.84742L629.96267,120.65572L628.83105,123.72727L627.53777,124.8589L627.05279,124.69724L625.59784,123.08063L621.07135,125.50554L620.42471,125.50554L619.29308,123.88893L618.48478,124.05059L616.54486,128.41543L615.57489,132.45694L612.39377,139.45774L611.21701,138.42347L609.84527,137.39215L607.90449,127.10413L604.36001,125.73408L602.30743,123.44785L590.18707,120.70437L587.3318,119.67473L579.10138,117.50199L571.21139,116.35887L567.49209,111.21318ZM697.8,177.2L694.6,168.9L692.3,159.9L689.9,156.7L687.3,154.9L685.7,156L681.8,157.8L679.9,162.8L677.1,166.5L676,167.2L674.5,166.5C674.5,166.5,671.9,165.1,672.1,164.4C672.3,163.8,672.6,159.4,672.6,159.4L676,158.1L676.8,154.7L677.4,152.1L679.9,150.5L679.5,140.5L677.9,138.2L676.6,137.4L675.8,135.3L676.6,134.5L678.2,134.8L678.4,133.2L676,131L674.7,128.4L672.1,128.4L667.6,126.9L662.1,123.5L659.3,123.5L658.7,124.2L657.7,123.7L654.6,121.4L651.7,123.2L648.8,125.5L649.2,129L650.1,129.3L652.2,129.8L652.7,130.6L650.1,131.4L647.5,131.8L646.1,133.5L645.8,135.6L646.1,137.3L646.4,142.8L642.8,144.9L642.2,144.7L642.2,140.5L643.5,138.1L644.1,135.6L643.3,134.8L641.4,135.6L640.4,139.8L637.7,141L635.9,142.9L635.7,143.9L636.4,144.7L635.7,147.3L633.5,147.8L633.5,148.9L634.3,151.3L633.1,157.5L631.5,161.5L632.2,166.2L632.7,167.3L631.9,169.8L631.5,170.6L631.2,173.3L634.8,179.3L637.7,185.8L639.1,190.6L638.3,195.3L637.3,201.3L634.9,206.4L634.6,209.2L631.3,212.3L635.8,212.1L657.2,209.9L664.4,208.9L664.5,210.5L671.4,209.3L681.7,207.8L685.5,207.4L685.7,206.8L685.8,205.3L687.9,201.6L689.9,199.9L689.7,194.8L691.3,193.2L692.4,192.9L692.6,189.3L694.2,186.3L695.2,186.9L695.4,187.5L696.2,187.7L698.1,186.7L697.8,177.2Z"},
        {id:"VT",n:"Vermont",d:"M844.48416,154.05791L844.80086,148.71228L841.91015,137.92811L841.26351,137.60479L838.35361,136.3115L839.16191,133.40161L838.35361,131.30002L835.65356,126.66004L836.62353,122.78018L835.81522,117.60703L833.39031,111.14059L832.58474,106.21808L859.0041,99.48626L859.3128,105.00847L861.22906,107.7507L861.22906,111.79222L857.52191,116.85021L854.93534,117.99288L854.92429,119.11345L856.23426,120.63257L855.92333,128.73054L855.3139,137.9894L855.08595,143.54634L856.05591,144.83963L855.89425,149.41032L855.40927,151.10021L856.42345,151.82737L848.9859,153.33408L844.48416,154.05791Z"},
        {id:"ME",n:"Maine",d:"M922.83976,78.830719L924.77969,80.932305L927.04294,84.650496L927.04294,86.590422L924.94135,91.278575L923.00142,91.925217L919.60655,94.996766L914.75674,100.49322C914.75674,100.49322,914.1101,100.49322,913.46346,100.49322C912.81682,100.49322,912.49349,98.391636,912.49349,98.391636L910.71523,98.553296L909.74527,100.00824L907.32036,101.46319L906.3504,102.91813L907.967,104.37307L907.48202,105.01972L906.99704,107.76794L905.05711,107.60628L905.05711,105.98968L904.73379,104.69639L903.27885,105.01972L901.50058,101.78651L899.399,103.07979L900.69228,104.53473L901.0156,105.66636L900.2073,106.95964L900.53062,110.03119L900.69228,111.64779L899.07568,114.23436L896.16579,114.71934L895.84247,117.62923L890.50767,120.70078L889.21439,121.18576L887.59778,119.73082L884.52623,123.28735L885.4962,126.52056L884.04125,127.81384L883.87959,132.17867L882.75631,138.43803L880.29406,137.28208L879.80907,134.21052L875.92922,133.07889L875.6059,130.33065L868.33115,106.88983L863.63257,92.250088L865.05311,92.131923L866.5669,92.541822L866.5669,89.955254L867.8752,85.458798L870.46177,80.770645L871.91672,76.729133L869.97679,74.304226L869.97679,68.322789L870.78509,67.352826L871.5934,64.604598L871.43174,63.149654L871.27007,58.29984L873.04834,53.450026L875.95823,44.5587L878.05981,40.355528L879.3531,40.355528L880.64638,40.517188L880.64638,41.648811L881.93967,43.912058L884.68789,44.5587L885.4962,43.750397L885.4962,42.780435L889.53771,39.870546L891.31597,38.092281L892.77092,38.253942L898.75235,40.678849L900.69228,41.648811L909.74527,71.555998L915.7267,71.555998L916.53501,73.495924L916.69667,78.345738L919.60655,80.608984L920.41486,80.608984L920.57652,80.124003L920.09154,78.99238L922.83976,78.830719ZM901.90801,108.97825L903.44379,107.44247L904.81791,108.49327L905.38372,110.91819L903.68628,111.80732L901.90801,108.97825ZM908.61694,103.07763L910.39521,104.93673C910.39521,104.93673,911.6885,105.01755,911.6885,104.69423C911.6885,104.37091,911.93099,102.67347,911.93099,102.67347L912.82013,101.86517L912.01182,100.08689L909.99106,100.81437L908.61694,103.07763Z"},
        {id:"RI",n:"Rhode Island",d:"M874.07001,178.89536L870.37422,163.93937L876.6435,162.09423L878.83463,164.02135L882.14112,168.342L884.82902,172.74409L881.82968,174.36888L880.5364,174.20722L879.40478,175.98549L876.97987,177.92541L874.07001,178.89536Z"},
        {id:"NY",n:"New York",d:"M830.37944,188.7456L829.24781,187.77564L826.66123,187.61398L824.39799,185.67406L822.76738,179.54493L819.30892,179.63547L816.86521,176.92727L797.47989,181.30921L754.47811,190.0389L746.94846,191.26689L746.2103,184.79855L747.6384,183.67317L748.93168,182.54155L749.90165,180.92494L751.67991,179.79332L753.61984,178.01505L754.10482,176.39845L756.2064,173.65022L757.33803,172.68026L757.17637,171.71029L755.88308,168.63875L754.10482,168.47709L752.16489,162.33399L755.07478,160.55572L759.43961,159.10078L763.48113,157.80749L766.71434,157.32251L773.01909,157.16085L774.95902,158.45414L776.57562,158.6158L778.67721,157.32251L781.26378,156.19089L786.43691,155.70591L788.5385,153.92764L790.31676,150.69443L791.93337,148.75451L794.03495,148.75451L795.97488,147.62288L796.13654,145.35964L794.6816,143.25805L794.35828,141.80311L795.4899,139.70152L795.4899,138.24658L793.71163,138.24658L791.93337,137.43828L791.12507,136.30665L790.96341,133.72008L796.78318,128.22363L797.42982,127.41533L798.88477,124.50544L801.79466,119.97894L804.54289,116.26075L806.64447,113.83585L809.05957,112.01024L812.14093,110.7643L817.63738,109.47101L820.87059,109.63267L825.39709,108.17773L832.96228,106.10656L833.48207,111.08623L835.90699,117.55267L836.71529,122.72582L835.74533,126.60568L838.3319,131.13218L839.1402,133.23377L838.3319,136.14367L841.2418,137.43695L841.88844,137.76027L844.96,148.75321L844.42371,153.81288L843.93873,164.64415L844.74703,170.14062L845.55533,173.69716L847.01028,180.9719L847.01028,189.05494L845.87865,191.31819L847.71798,193.31098L848.51453,194.9894L846.57461,196.76767L846.89793,198.06095L848.19121,197.73763L849.64616,196.44435L851.9094,193.85778L853.04103,193.21114L854.65763,193.85778L856.92088,194.01944L864.84224,190.13959L867.75213,187.39136L869.04541,185.93642L873.24858,187.55302L869.85371,191.10955L865.97386,194.01944L858.8608,199.35423L856.27424,200.3242L850.45446,202.26412L846.41295,203.39575L845.23821,202.86282L844.99419,199.17429L845.47917,196.42605L845.31751,194.32447L842.504,192.62547L837.9775,191.6555L834.09764,190.52388L830.37944,188.7456Z"},
        {id:"PA",n:"Pennsylvania",d:"M825.1237,224.69205L826.43212,224.42105L828.76165,223.1678L829.97353,220.68473L831.59014,218.42148L834.82335,215.34992L834.82335,214.54162L832.39844,212.92502L828.8419,210.5001L827.87194,207.91353L825.1237,207.59021L824.96204,206.45858L824.15374,203.71035L826.417,202.57873L826.57866,200.15381L825.28536,198.86052L825.44702,197.24391L827.38696,194.17236L827.38696,191.1008L830.08459,188.45492L829.16431,187.77994L826.64023,187.58703L824.34574,185.64711L822.79582,179.53105L819.29124,179.63157L816.83601,176.92824L798.74502,181.12601L755.74324,189.8557L746.85189,191.31064L746.23122,184.78925L740.86869,189.8569L739.5754,190.34188L735.37311,193.35077L738.28387,212.48822L740.76553,222.21758L744.33733,241.47907L747.60664,240.84139L759.55022,239.33892L797.47685,231.67372L812.35306,228.8504L820.65341,227.22804L820.92052,226.98951L823.02212,225.37289L825.1237,224.69205Z"},
        {id:"NJ",n:"New Jersey",d:"M829.67942,188.46016L827.35687,191.19443L827.35687,194.26599L825.41693,197.33754L825.25527,198.95416L826.54857,200.24744L826.38691,202.67236L824.12365,203.80398L824.93195,206.55221L825.09361,207.68384L827.84185,208.00716L828.81181,210.59373L832.36835,213.01865L834.79326,214.63525L834.79326,215.44356L831.81005,218.14012L830.19344,220.40336L828.73849,223.1516L826.47524,224.44488L826.01279,226.04736L825.77029,227.25982L825.16106,229.86656L826.25333,232.11075L829.48654,235.02064L834.33635,237.28389L838.37786,237.93053L838.53952,239.38547L837.73122,240.35543L838.05454,243.10366L838.86284,243.10366L840.96443,240.67876L841.77273,235.82894L844.52096,231.78743L847.59251,225.32101L848.72413,219.82456L848.07749,218.69293L847.91583,209.31662L846.29922,205.92176L845.1676,206.73006L842.41937,207.05338L841.93439,206.5684L843.06602,205.59843L845.1676,203.65851L845.23066,202.56468L844.84627,199.13084L845.41964,196.3826L845.30217,194.41359L842.49463,192.66324L837.40249,191.48748L833.26505,190.10585L829.67942,188.46016Z"},
        {id:"DE",n:"Delaware",d:"M825.6261,228.2791L825.99441,226.13221L826.36948,224.44116L824.74648,224.83892L823.13102,225.30648L820.92476,227.07078L822.64488,232.11366L824.90814,237.77178L827.00972,247.47143L828.62634,253.77621L833.63782,253.61455L839.77994,252.43387L837.51571,245.0476L836.54574,245.53258L832.98921,243.10768L831.21095,238.41952L829.27102,234.86299L826.1239,231.99268L825.25974,229.89456L825.6261,228.2791Z"},
        {id:"MD",n:"Maryland",d:"M839.79175,252.41476L833.7832,253.6186L828.6403,253.73606L826.79674,246.81373L824.87193,237.64441L822.29931,231.45596L821.01093,227.05763L813.50491,228.67999L798.6287,231.50331L761.17727,239.05421L762.30857,244.06587L763.27853,249.72398L763.60185,249.40066L765.70345,246.97576L767.96669,244.3581L770.3916,243.74254L771.84656,242.28759L773.62482,239.70102L774.9181,240.34767L777.82799,240.02434L780.41457,237.92276L782.42146,236.46949L784.26669,235.98451L785.91104,237.11446L788.82093,238.5694L790.76085,240.34767L791.97331,241.88345L796.09566,243.58088L796.09566,246.49077L801.59212,247.78406L802.73656,248.32604L804.14846,246.29772L807.03043,248.26788L805.75226,250.74981L804.98699,254.73547L803.20873,257.32204L803.20873,259.42363L803.85537,261.2019L808.91932,262.55759L813.23042,262.49587L816.30196,263.46584L818.40355,263.78916L819.37351,261.68757L817.91857,259.58599L817.91857,257.80772L815.49366,255.70613L813.39208,250.20968L814.68536,244.87488L814.5237,242.7733L813.23042,241.48001C813.23042,241.48001,814.68536,239.86341,814.68536,239.21677C814.68536,238.57012,815.17034,237.11518,815.17034,237.11518L817.11027,235.8219L819.05019,234.20529L819.53517,235.17526L818.08023,236.79186L816.78695,240.51005L817.11027,241.64167L818.88853,241.96499L819.37351,247.46145L817.27193,248.43141L817.59525,251.98794L818.08023,251.82628L819.21185,249.88636L820.82846,251.66462L819.21185,252.95791L818.88853,256.35278L821.4751,259.74765L825.35495,260.23263L826.97156,259.42433L830.20811,263.60726L831.56646,264.14356L838.22013,261.34661L840.22771,257.32274L839.79175,252.41476ZM823.82217,261.44348L824.95379,263.94923L825.11545,265.7275L826.24708,267.5866C826.24708,267.5866,827.13622,266.69746,827.13622,266.37414C827.13622,266.05082,826.40875,263.30258,826.40875,263.30258L825.68127,260.95849L823.82217,261.44348Z"},
        {id:"VA",n:"Virginia",d:"M831.63885,266.06892L831.49494,264.12189L837.94837,261.57201L837.17796,264.78985L834.25801,268.56896L833.83992,273.15478L834.30167,276.54522L832.4737,281.52338L830.30943,283.43952L828.83909,278.79871L829.28498,273.3496L830.87198,269.16653L831.63885,266.06892ZM834.97904,294.37028L776.80486,306.94571L739.37789,312.22478L732.69956,311.8496L730.11431,313.77598L722.77518,313.99667L714.39307,314.97434L703.47811,316.58896L713.94754,310.97776L713.93442,308.90283L715.45447,306.7567L726.00825,295.25527L729.95497,299.73273L733.73798,300.69671L736.28144,299.55639L738.51866,298.24523L741.05527,299.58875L744.96944,298.16099L746.84617,293.60465L749.44709,294.14467L752.30233,292.01342L754.1016,292.50702L756.92881,288.83045L757.27706,286.74734L756.3134,285.47177L757.31617,283.60514L762.59044,271.32799L763.20721,265.59291L764.4361,265.06937L766.61463,267.51224L770.55049,267.21107L772.4797,259.63744L775.27369,259.07658L776.32344,256.33551L778.90326,253.98863L781.67509,248.29344L781.76002,243.22589L791.58153,247.04871C792.26238,247.38913,792.41441,241.99956,792.41441,241.99956L796.06697,243.59789L796.1353,246.53605L801.91955,247.83554L804.0525,249.01174L805.71242,251.06743L805.05787,254.7161L803.11043,257.30708L803.22028,259.36615L803.80924,261.21906L808.78799,262.48749L813.23926,262.52737L816.30809,263.48601L818.2516,263.79531L818.96641,266.88377L822.15685,267.2863L823.02492,268.48632L822.58543,273.1764L823.96016,274.27895L823.48121,276.20934L824.71062,276.99911L824.48882,278.38371L821.79483,278.28877L821.88379,279.90429L824.16478,281.44716L824.28632,282.85906L826.05943,284.64444L826.55122,287.16857L823.99818,288.54988L825.5704,290.04418L831.37142,288.35835L834.97904,294.37028Z"},
        {id:"WV",n:"West Virginia",d:"M761.18551,238.96731L762.29752,243.91184L763.38096,249.94317L765.51125,247.36283L767.77449,244.29127L770.31287,243.67572L771.76782,242.22078L773.54609,239.63421L774.99107,240.28085L777.90096,239.95753L780.48754,237.85594L782.49443,236.40268L784.33966,235.91769L785.64358,236.93416L789.28683,238.75579L791.22676,240.53406L792.60088,241.82734L791.83916,247.38228L786.00425,244.84106L781.759,243.21904L781.65786,248.39747L778.91022,253.9342L776.38019,256.36086L775.1881,259.11025L772.54452,259.61035L771.64668,263.21223L770.60345,267.1619L766.63521,267.50264L764.31148,265.06376L763.24033,265.62317L762.60765,271.09287L761.25736,274.62737L756.29896,285.58234L757.19565,286.74304L756.98979,288.65158L754.1811,292.53605L752.3726,291.99176L749.40455,294.1515L746.86217,293.57929L744.86294,298.13486C744.86294,298.13486,741.60363,299.56508,740.94003,299.50258C740.77952,299.48746,738.47093,298.25348,738.47093,298.25348L736.13441,299.63285L733.72461,300.67725L729.97992,299.78813L728.85852,298.61985L726.6663,295.59649L723.52371,293.60837L721.81214,289.98513L717.52726,286.51694L716.88061,284.25369L714.29404,282.79874L713.48573,281.18214L713.24324,275.92816L715.42566,275.84733L717.3656,275.03903L717.52726,272.2908L719.14386,270.83585L719.30552,265.82437L720.27548,261.94451L721.56877,261.29787L722.86205,262.42949L723.34704,264.20776L725.12531,263.23779L725.61029,261.62119L724.47867,259.84292L724.47867,257.41801L725.44863,256.12472L727.71188,252.72985L729.00516,251.27491L731.10676,251.75989L733.37,250.14327L736.44155,246.7484L738.70481,242.86854L739.02813,237.21043L739.51311,232.19894L739.51311,227.51078L738.38149,224.43923L739.35145,222.98427L740.63493,221.69099L744.12618,241.51811L748.75719,240.76696L761.18551,238.96731Z"},
        {id:"OH",n:"Ohio",d:"M735.32497,193.32832L729.23143,197.38167L725.35158,199.64492L721.95671,203.36311L717.9152,207.24296L714.68199,208.05126L711.7721,208.53624L706.27564,211.12281L704.17406,211.28447L700.77919,208.21292L695.60605,208.85957L693.01949,207.40462L690.63842,206.05379L685.74585,206.7572L675.56123,208.37381L664.35436,210.55854L665.64765,225.18882L667.42592,238.92999L670.01248,262.37079L670.5783,267.20196L674.70065,267.07294L677.12556,266.26463L680.48936,267.76777L682.55985,272.1326L687.69879,272.1155L689.59053,274.2342L691.3517,274.1689L693.89009,272.82744L696.39426,273.19894L701.81554,273.68162L703.54251,271.54894L705.88816,270.25566L707.95865,269.57481L708.60529,272.32305L710.38357,273.29301L713.85926,275.63708L716.04168,275.55626L717.3748,275.06378L717.55951,272.30225L719.14487,270.84729L719.24403,266.05457C719.24403,266.05457,720.26799,261.94551,720.26799,261.94551L721.56726,261.34423L722.88861,262.49197L723.42676,264.18899L725.14589,263.15157L725.58487,261.69082L724.46818,259.78776L724.53447,257.47333L725.28347,256.40102L727.43623,253.09454L728.48645,251.5512L730.58804,252.03618L732.85129,250.41957L735.92284,247.0247L738.69433,242.94597L739.01466,237.89046L739.49964,232.87897L739.32286,227.57209L738.36802,224.67731L738.71926,223.48753L740.52365,221.73742L738.23486,212.69009L735.32497,193.32832Z"},
        {id:"IN",n:"Indiana",d:"M619.56954,299.97132L619.63482,297.11274L620.11981,292.58623L622.38305,289.67635L624.16133,285.79648L626.74789,281.59331L626.26291,275.77352L624.48465,273.02529L624.16133,269.79208L624.96963,264.29561L624.48465,257.3442L623.19135,241.33979L621.89807,225.98203L620.9276,214.26201L623.99866,215.15152L625.45361,216.12148L626.58523,215.79816L628.68682,213.85824L631.51639,212.24125L636.60919,212.07921L658.59506,209.81595L664.17079,209.28279L665.67393,225.239L669.92528,262.08055L670.52374,267.85215L670.15224,270.1154L671.38022,271.91077L671.47661,273.28332L668.95532,274.88283L665.41589,276.43414L662.21376,276.98442L661.6153,281.85135L657.04061,285.16382L654.24419,289.17426L654.56751,291.55099L653.98617,293.08519L650.6597,293.08519L649.07417,291.46859L646.58086,292.73079L643.8979,294.23393L644.05957,297.28838L642.86578,297.54641L642.3979,296.52827L640.23102,295.02513L636.9807,296.36661L635.42939,299.37286L633.99155,298.56456L632.5366,296.96505L628.07226,297.45004L622.47943,298.42L619.56954,299.97132Z"},
        {id:"IL",n:"Illinois",d:"M619.54145,300.34244L619.5727,297.11273L620.14009,292.46677L622.47262,289.55091L624.33927,285.47515L626.57229,281.47982L626.20079,276.22742L624.19558,272.68485L624.0992,269.33817L624.79403,264.06866L623.96862,256.89029L622.90228,241.11284L621.609,226.0955L620.68672,214.4563L620.41421,213.53491L619.60591,210.94834L618.31263,207.23015L616.69602,205.45188L615.24108,202.86532L615.00751,197.37636L569.21108,199.97461L569.4397,202.34656L571.72593,203.03243L572.64041,204.17554L573.09766,206.00452L576.98424,209.43386L577.67012,211.72009L576.98424,215.14943L575.15526,218.80739L574.4694,221.32223L572.18317,223.15122L570.35419,223.83709L565.09587,225.20882L564.41,227.0378L563.72413,229.09541L564.41,230.46715L566.23898,232.06751L566.01036,236.18271L564.18137,237.78307L563.49551,239.38343L563.49551,242.1269L561.66653,242.58414L560.06617,243.72726L559.83755,245.099L560.06617,247.1566L558.3515,248.47117L557.3227,251.27181L557.77994,254.92976L560.06617,262.24569L567.3821,269.79024L572.86903,273.4482L572.64041,277.79203L573.55491,279.16377L579.95634,279.62101L582.69981,280.99275L582.01395,284.65071L579.72772,290.5949L579.04185,293.79562L581.32807,297.6822L587.72951,302.94052L592.30197,303.62639L594.35956,308.65609L596.41717,311.8568L595.50268,314.82889L597.10304,318.9441L598.93202,321.00171L600.34605,320.12102L601.25371,318.04623L603.46679,316.29903L605.59826,315.68463L608.20079,316.86443L611.82778,318.24013L613.01673,317.9419L613.2166,315.68345L611.9293,313.27166L612.23352,310.89494L614.07192,309.54749L617.09446,308.7372L618.35536,308.27868L617.74275,306.8918L616.95138,304.53743L618.38398,303.55647L619.54145,300.34244Z"},
        {id:"CT",n:"Connecticut",d:"M874.06831,178.86288L870.39088,163.98407L865.67206,164.90438L844.44328,169.64747L845.44347,172.87314L846.89842,180.14788L847.0752,189.1148L845.85518,191.28967L847.77597,193.22201L852.0475,189.31637L855.60403,186.08316L857.54395,183.98157L858.35226,184.62821L861.10048,183.17327L866.27362,182.04165L874.06831,178.86288Z"},
        {id:"WI",n:"Wisconsin",d:"M615.06589,197.36866L614.99915,194.21124L613.82004,189.68474L613.1734,183.54165L612.04178,181.11674L613.01174,178.04519L613.82004,175.1353L615.27499,172.54874L614.62834,169.15387L613.9817,165.59734L614.46668,163.81907L616.40661,161.39416L616.56827,158.64593L615.75997,157.35265L616.40661,154.76608L615.95409,150.59537L618.70232,144.93726L621.61221,138.14752L621.77387,135.88427L621.45055,134.91431L620.64224,135.39929L616.43907,141.70405L613.69084,145.74556L611.75092,147.52383L610.94262,149.78707L608.98767,150.59537L607.85605,152.5353L606.4011,152.21198L606.23944,150.43371L607.53273,148.00881L609.63431,143.32065L611.41258,141.70405L612.40341,139.3462L609.84296,137.44486L607.86814,127.07787L604.32067,125.73589L602.37441,123.42756L590.2447,120.70592L587.36881,119.69387L579.15569,117.52658L571.23777,116.36783L567.47261,111.23716L566.72221,111.79117L565.5243,111.62951L564.87765,110.49789L563.54364,110.79444L562.41201,110.9561L560.63375,111.92606L559.66378,111.27942L560.31043,109.33949L562.25035,106.26794L563.38197,105.13632L561.44205,103.68138L559.34046,104.48968L556.43057,106.4296L548.99419,109.66281L546.0843,110.30945L543.17442,109.82447L542.19269,108.94622L540.07599,111.7814L539.84737,114.52487L539.84737,122.9839L538.70425,124.58427L533.44593,128.47084L531.15971,134.41503L531.61695,134.64365L534.1318,136.70126L534.81766,139.90198L532.98868,143.10269L532.98868,146.98928L533.44593,153.61933L536.41802,156.59143L539.84737,156.59143L541.67635,159.79215L545.10568,160.24939L548.99227,165.96496L556.07957,170.08017L558.13717,172.82364L559.05167,180.25388L559.73753,183.5689L562.02376,185.16926L562.25238,186.541L560.19478,189.97033L560.4234,193.17106L562.93825,197.05764L565.4531,198.20075L568.42519,198.65799L569.76753,200.03811L615.06589,197.36866Z"},
        {id:"NC",n:"North Carolina",d:"M834.98153,294.31554L837.06653,299.23289L840.62306,305.69931L843.04796,308.12422L843.6946,310.38747L841.2697,310.54913L842.078,311.19577L841.75468,315.39894L839.16811,316.69222L838.52147,318.79381L837.22819,321.7037L833.50999,323.3203L831.08509,322.99698L829.63014,322.83532L828.01354,321.54204L828.33686,322.83532L828.33686,323.80529L830.27679,323.80529L831.08509,325.09857L829.14516,331.40333L833.34833,331.40333L833.99498,333.01993L836.25822,330.75669L837.55151,330.2717L835.61158,333.82823L832.54003,338.67805L831.24675,338.67805L830.11512,338.19307L827.3669,338.83971L822.19376,341.26462L815.72734,346.59941L812.33247,351.28756L810.39255,357.75398L809.90757,360.17889L805.21941,360.66387L799.76628,362.00053L789.81987,353.798L777.21033,346.19995L774.30044,345.39164L761.69091,346.84659L757.41445,347.59674L755.79785,344.36352L752.82749,342.24682L736.3381,342.7318L729.06336,343.5401L720.01037,348.06661L713.86726,350.65317L692.68971,353.23975L693.1898,349.18542L694.96807,347.73048L697.71631,347.08383L698.36295,343.36563L702.56613,340.61741L706.44598,339.16245L710.64917,335.60592L715.014,333.50433L715.66064,330.43277L719.5405,326.55292L720.18714,326.39126C720.18714,326.39126,720.18714,327.52289,720.99545,327.52289C721.80375,327.52289,722.93538,327.84621,722.93538,327.84621L725.19863,324.28967L727.30022,323.64302L729.56346,323.96635L731.18008,320.40982L734.08997,317.82324L734.57495,315.72165L734.76245,312.07346L739.03895,312.05094L746.23754,311.19515L761.99477,308.94272L777.13081,306.85615L798.77129,302.1368L818.75461,297.87823L829.93155,295.47242L834.98153,294.31554ZM839.25199,327.52211L841.83857,325.01636L844.99095,322.42978L846.52673,321.78314L846.68839,319.76238L846.04175,313.61926L844.5868,311.27518L843.94015,309.41608L844.66763,309.17358L847.41587,314.67006L847.82002,319.11573L847.65836,322.51062L844.26348,324.04639L841.43441,326.47131L840.30279,327.68377L839.25199,327.52211Z"},
        {id:"DC",n:"Washington DC",d:"M805.81945,250.84384L803.96117,249.01967L802.72854,248.33338L804.17155,246.31091L807.06064,248.25941L805.81945,250.84384Z"},
        {id:"MA",n:"Massachusets",d:"M899.62349,173.25394L901.79541,172.56806L902.25267,170.85339L903.28147,170.9677L904.31027,173.25394L903.05285,173.71118L899.16625,173.8255L899.62349,173.25394ZM890.24995,174.05412L892.53617,171.42495L894.13654,171.42495L895.96553,172.911L893.56499,173.9398L891.39307,174.9686L890.24995,174.05412ZM855.45082,152.06593L873.09769,147.42525L875.36095,146.77861L877.27503,143.9829L881.0118,142.31959L883.90104,146.73243L881.47613,151.90557L881.15281,153.36051L883.09274,155.94708L884.22436,155.13878L886.00263,155.13878L888.26587,157.72534L892.14573,163.70678L895.70226,164.19176L897.9655,163.2218L899.74377,161.44353L898.93546,158.69531L896.83388,157.0787L895.37893,157.887L894.40897,156.59372L894.89395,156.10874L896.99554,155.94708L898.7738,156.75538L900.71373,159.18029L901.68369,162.09018L902.00701,164.51508L897.80384,165.97003L893.92399,167.90995L890.04414,172.43645L888.10421,173.89139L888.10421,172.92143L890.52912,171.46648L891.0141,169.68822L890.2058,166.61667L887.29591,168.07161L886.48761,169.52656L886.97259,171.7898L884.90626,172.79023L882.15906,168.2631L878.76418,163.89826L876.69368,162.08579L870.16041,163.96199L865.06808,165.01278L844.39292,169.60499L843.72516,164.83714L844.3718,154.24837L848.66107,153.35923L855.45082,152.06593Z"},
        {id:"TN",n:"Tennessee",d:"M696.67788,318.25411L644.78479,323.2656L629.02523,325.04386L624.40403,325.55657L620.53568,325.52885L620.31471,329.62968L612.12933,329.89369L605.17792,330.54033L597.08709,330.41647L595.67331,337.48933L593.97708,342.96938L590.68391,345.72022L589.33517,350.10128L589.01185,352.68785L584.97033,354.95109L586.42527,358.50763L585.45531,362.87247L584.48693,363.66212L692.64548,353.25457L693.04875,349.29963L694.85948,347.80924L697.69363,347.05979L698.36556,343.34281L702.46416,340.63785L706.51109,339.14382L710.59467,335.57349L715.03076,333.54803L715.55202,330.48068L719.61662,326.49569L720.16742,326.38152C720.16742,326.38152,720.19867,327.51314,721.00697,327.51314C721.81527,327.51314,722.9469,327.86771,722.9469,327.86771L725.21015,324.27992L727.28049,323.63328L729.5556,323.92849L731.15391,320.39563L734.10916,317.75172L734.53084,315.81261L734.8398,312.10146L732.69325,311.90169L730.09157,313.93002L723.09826,313.95909L704.73897,316.34591L696.67788,318.25411Z"},
        {id:"AR",n:"Arkansas",d:"M593.82477,343.05296L589.84489,343.76966L584.73274,343.13563L585.15344,341.53356L588.13319,338.96687L589.07657,335.31062L587.24759,332.33852L508.83002,334.85337L510.43038,341.71206L510.43037,349.94248L511.80212,360.91647L512.03074,398.7534L514.31697,400.69669L517.28906,399.32496L520.03254,400.46807L520.71288,407.04137L576.33414,405.90077L577.47977,403.8104L577.19315,400.26089L575.36752,397.28879L576.96621,395.80358L575.36752,393.29208L576.05172,390.78225L577.42011,385.17682L579.9383,383.11419L579.25243,380.82963L582.9104,375.45784L585.65387,374.08945L585.54039,372.59587L585.19495,370.77023L588.0519,365.1715L590.45494,363.91491L590.83907,360.48728L592.60974,359.24558L589.46622,358.76131L588.12476,354.75087L590.92884,352.37416L591.4791,350.35496L592.75858,346.30835L593.82477,343.05296Z"},
        {id:"MO",n:"Missouri",d:"M558.44022,248.11316L555.92035,245.02591L554.77723,242.73968L490.42,245.14022L488.13374,245.25453L489.39117,247.76938L489.16255,250.0556L491.67739,253.94219L494.76379,258.0574L497.8502,260.80087L500.01143,261.02949L501.50816,261.94399L501.50816,264.91608L499.67919,266.51644L499.22193,268.80266L501.27954,272.23201L503.7944,275.2041L506.30924,277.03308L507.68097,288.69283L507.99511,324.76504L508.22373,329.45179L508.68097,334.8353L531.11396,333.96848L554.31999,333.28261L575.12465,332.4816L586.77939,332.2513L588.94879,335.6773L588.2646,338.9848L585.17735,341.38784L584.60496,343.22518L589.98345,343.68244L593.87841,342.99656L595.59559,337.50293L596.24701,331.64614L598.34504,329.09098L600.94107,327.60409L600.9925,324.55385L602.00852,322.61737L600.31429,320.0736L598.98336,321.05786L596.99074,318.83062L595.70571,314.07162L596.50672,311.55342L594.56259,308.12576L592.73195,303.54996L587.93254,302.75062L580.96374,297.15187L579.24488,293.03834L580.04423,289.83762L582.1035,283.77995L582.56242,280.91632L580.61328,279.88501L573.75794,279.08734L572.72997,277.37518L572.61817,273.14482L567.13123,269.71381L560.15572,261.94231L557.8695,254.62638L557.63921,250.40106L558.44022,248.11316Z"},
        {id:"GA",n:"Georgia",d:"M672.29229,355.5518L672.29229,357.73422L672.45395,359.83582L673.10059,363.23069L676.49547,371.15206L678.92038,381.01337L680.37532,387.15648L681.99193,392.00629L683.44688,398.9577L685.54847,405.26247L688.13504,408.65735L688.62002,412.05222L690.55995,412.86052L690.72161,414.96212L688.94334,419.81193L688.45836,423.04515L688.2967,424.98508L689.91331,429.34992L690.23663,434.68472L689.42832,437.10963L690.07497,437.91794L691.52992,438.72624L691.73462,441.94433L693.96763,445.29386L696.21807,447.45591L704.13945,447.61757L714.9592,446.97093L736.47159,445.67765L741.91731,445.00328L746.49456,445.03101L746.65622,447.9409L749.24279,448.7492L749.56611,444.38436L747.9495,439.85786L749.08113,438.24126L754.90091,439.04956L759.87832,439.36734L759.1029,433.06855L761.36614,423.0456L762.82109,418.84242L762.3361,416.25586L765.67051,410.01156L765.16021,408.65988L763.2468,409.36446L760.66024,408.07116L760.01359,405.96957L758.72031,402.41304L756.45705,400.31145L753.87049,399.66481L752.25388,394.81499L749.32887,388.47999L745.1257,386.54006L743.0241,384.60013L741.73081,382.01356L739.62923,380.07363L737.36598,378.78034L735.10273,375.87045L732.03118,373.60721L727.50467,371.82893L727.01969,370.37399L724.59478,367.4641L724.1098,366.00915L720.71492,361.03867L717.19505,361.13784L713.44014,358.7817L712.02186,357.48842L711.69854,355.71015L712.56934,353.77023L714.79598,352.66009L714.16204,350.56287L672.29229,355.5518Z"},
        {id:"SC",n:"South Carolina",d:"M764.94328,408.16488L763.16622,409.13438L760.57965,407.84109L759.93301,405.7395L758.63973,402.18297L756.37647,400.08137L753.7899,399.43473L752.1733,394.58492L749.42506,388.60347L745.22189,386.66353L743.12029,384.72361L741.82701,382.13704L739.72542,380.1971L737.46217,378.90382L735.19892,375.99393L732.12737,373.73069L727.60086,371.95241L727.11588,370.49747L724.69098,367.58758L724.20599,366.13262L720.81111,360.95949L717.41624,361.12115L713.37472,358.69623L712.08144,357.40295L711.75812,355.62468L712.56642,353.68476L714.82967,352.71478L714.31885,350.4257L720.08695,348.08913L729.20245,343.50013L736.97718,342.69182L753.09158,342.26934L755.72983,344.14677L757.40893,347.50499L761.71128,346.89501L774.32081,345.44005L777.2307,346.24836L789.84024,353.84642L799.94832,361.9681L794.52715,367.42644L791.94058,373.56954L791.4556,379.8743L789.839,380.6826L788.70737,383.43083L786.28247,384.07747L784.18088,387.634L781.43265,390.38223L779.16941,393.7771L777.5528,394.5854L773.99627,397.98027L771.08638,398.14193L772.05635,401.37514L767.04487,406.8716L764.94328,408.16488Z"},
        {id:"KY",n:"Kentucky",d:"M725.9944,295.2707L723.70108,297.67238L720.12289,301.66642L715.19834,307.13109L713.98257,308.84686L713.92007,310.94844L709.54021,313.11253L703.88209,316.50741L696.65022,318.30626L644.78233,323.20512L629.02277,324.98338L624.40157,325.49609L620.53322,325.46837L620.30627,329.68865L612.12686,329.83321L605.17545,330.47985L597.18797,330.41963L598.39575,329.09955L600.89529,327.5587L601.12392,324.35797L602.03841,322.52899L600.43159,319.99009L601.23342,318.08328L603.49668,316.30502L605.59826,315.65837L608.34649,316.95166L611.90303,318.24494L613.03466,317.92162L613.19632,315.65837L611.90303,313.23346L612.22635,310.97021L614.16628,309.51527L616.75286,308.86862L618.36946,308.22198L617.56116,306.44371L616.91452,304.50378L618.42114,303.50798C618.42442,303.47086,619.6751,299.98569,619.65943,299.85017L622.71265,298.37149L628.03244,297.40153L632.52648,296.91655L633.91892,298.54398L635.44719,299.41478L637.03796,296.30657L640.22504,295.02395L642.43013,296.50798L642.84069,297.50702L644.01421,297.24301L643.85254,294.29008L646.98341,292.54089L649.1315,291.46741L650.66086,293.12822L653.97901,293.08402L654.56634,291.51277L654.19883,289.24953L656.79936,285.25103L661.57591,281.81313L662.28186,276.97727L665.20688,276.52136L668.99834,274.87568L671.44166,273.16744L671.24333,271.60251L670.10088,270.14757L670.6667,267.15266L674.85155,267.03516L677.15146,266.28936L680.49885,267.71846L682.55296,272.0833L687.68525,272.09412L689.73626,274.30231L691.35171,274.15461L693.9534,272.87644L699.19046,273.44981L701.76538,273.66732L703.45296,271.61108L706.07091,270.1852L707.95269,269.4781L708.59933,272.31473L710.64276,273.37307L713.28552,275.45556L713.40299,281.1288L714.21129,282.70121L716.80101,284.25749L717.57265,286.552L721.73254,289.98894L723.53785,293.61218L725.9944,295.2707Z"},
        {id:"AL",n:"Alabama",d:"M631.30647,460.41572L629.81587,446.09422L627.06763,427.34158L627.22929,413.27709L628.03759,382.23824L627.87593,365.58718L628.04102,359.16812L672.5255,355.54867L672.3777,357.73109L672.53936,359.83269L673.18601,363.22756L676.58089,371.14893L679.00579,381.01024L680.46074,387.15335L682.07734,392.00317L683.5323,398.95458L685.63388,405.25934L688.22045,408.65423L688.70543,412.04909L690.64537,412.8574L690.80703,414.95899L689.02875,419.80881L688.54377,423.04203L688.38211,424.98195L689.99873,429.3468L690.32205,434.68159L689.51373,437.10651L690.16039,437.91481L691.61533,438.72311L691.94347,441.61193L686.34581,441.25838L679.55606,441.90503L654.01366,444.81491L643.6021,446.22168L643.38072,449.09908L645.15899,450.87735L647.74556,452.81727L648.32642,460.75271L642.78436,463.32561L640.03614,463.00229L642.78436,461.06236L642.78436,460.0924L639.71282,454.11096L637.44957,453.46432L635.99462,457.82915L634.70134,460.57738L634.0547,460.41572L631.30647,460.41572Z"},
        {id:"LA",n:"Louisiana",d:"M607.96706,459.16125L604.68245,455.99511L605.69236,450.49488L605.03101,449.6018L595.76934,450.60836L570.74102,451.06728L570.05683,448.6726L570.96964,440.2169L574.28552,434.27105L579.31688,425.58003L578.74281,423.18201L579.9994,422.50116L580.45833,420.54867L578.17209,418.49274L578.0603,416.55029L576.22964,412.20478L576.08259,405.86618L520.6088,406.79015L520.63737,416.36372L521.32324,425.73725L522.00911,429.62383L524.52396,433.73904L525.43845,438.76875L529.78228,444.25568L530.0109,447.4564L530.69677,448.14227L530.0109,456.60131L527.03881,461.631L528.63917,463.68861L527.95329,466.20345L527.26743,473.51938L525.89569,476.72009L526.01815,480.33654L530.70463,478.81639L542.81798,479.0234L553.16425,482.57993L559.63067,483.71156L563.34886,482.25661L566.58207,483.38824L569.81528,484.3582L570.62358,482.25661L567.39037,481.12499L564.8038,481.60997L562.05557,479.99337C562.05557,479.99337,562.21724,478.70008,562.86388,478.53842C563.51052,478.37676,565.93543,477.56846,565.93543,477.56846L567.71369,479.0234L569.49196,478.05344L572.72517,478.70008L574.18011,481.12499L574.50343,483.38824L579.02992,483.71156L580.80819,485.48982L579.99989,487.10643L578.7066,487.91473L580.32321,489.53133L588.72955,493.08786L592.28608,491.79458L593.25605,489.36967L595.84261,488.72303L597.62088,487.26809L598.91416,488.23805L599.72246,491.14794L597.45922,491.95624L598.10586,492.60288L601.50073,491.3096L603.76398,487.91473L604.57228,487.42975L602.47069,487.10643L603.27899,485.48982L603.11733,484.03488L605.21892,483.5499L606.35054,482.25661L606.99718,483.06491C606.99718,483.06491,606.83552,486.13646,607.64383,486.13646C608.45213,486.13646,611.847,486.78311,611.847,486.78311L615.88851,488.72303L616.85847,490.17798L619.76836,490.17798L620.89999,491.14794L623.16323,488.07639L623.16323,486.62144L621.86995,486.62144L618.47508,483.87322L612.6553,483.06491L609.42209,480.80167L610.55372,478.05344L612.81696,478.37676L612.97862,477.73012L611.20036,476.76016L611.20036,476.27517L614.43357,476.27517L616.21183,473.20363L614.91855,471.2637L614.59523,468.51547L613.14028,468.67713L611.20036,470.77872L610.55372,473.36529L607.48217,472.71864L606.5122,470.94038L608.29047,469.00045L610.1938,465.55485L609.1327,463.14258L607.96706,459.16125Z"},
        {id:"MS",n:"Mississippi",d:"M631.55882,459.34458L631.30456,460.60073L626.13142,460.60073L624.67648,459.79243L622.57489,459.46911L615.78515,461.40903L614.00689,460.60073L611.42032,464.8039L610.31778,465.58192L609.19395,463.09394L608.05083,459.20735L604.6215,456.00664L605.7646,450.46209L605.07874,449.5476L603.24976,449.77622L595.33184,450.64959L570.78534,451.02296L570.0156,448.7976L570.88897,440.4208L574.00581,434.74799L579.23288,425.60309L578.78714,423.17049L580.024,422.51424L580.45987,420.59477L578.14239,418.51579L578.02727,416.37431L576.19155,412.25322L576.08255,406.29045L577.41008,403.80948L577.18678,400.39373L575.41729,397.31114L576.94371,395.82893L575.3731,393.32939L575.83035,391.67718L577.40775,385.15081L579.8937,383.11446L579.25203,380.74749L582.91,375.44496L585.74186,374.08854L585.52089,372.41338L585.23276,370.73228L588.10882,365.16461L590.45454,363.9331L590.60617,363.04009L627.94965,359.15892L628.13451,365.44225L628.29617,382.09331L627.48787,413.13216L627.32621,427.19665L630.07445,445.94929L631.55882,459.34458Z"},
        {id:"IA",n:"Iowa",d:"M569.19154,199.5843L569.45592,202.3705L571.67964,202.94776L572.63358,204.17309L573.13359,206.02845L576.92643,209.3871L577.6123,211.7786L576.93796,215.20307L575.35565,218.43505L574.55631,221.17684L572.38356,222.77888L570.66805,223.35128L565.08903,225.21148L563.69757,229.06017L564.42621,230.43191L566.26672,232.1145L565.98379,236.15079L564.22064,237.68865L563.44923,239.33179L563.57645,242.10811L561.69014,242.56535L560.06469,243.67026L559.7859,245.02289L560.06469,247.13781L558.51367,248.25388L556.04314,245.1206L554.78057,242.67073L489.04475,245.18558L488.12672,245.35102L486.07432,240.83506L485.8457,234.20499L484.24534,230.08978L483.55948,224.83147L481.27325,221.1735L480.35877,216.37243L477.61529,208.82788L476.47218,203.45524L475.10044,201.28333L473.50008,198.53987L475.45406,193.69604L476.8258,187.98047L474.08233,185.92286L473.62508,183.17939L474.53958,180.66454L476.25425,180.66454L558.90825,179.39506L559.74251,183.57818L561.99469,185.13915L562.2514,186.56224L560.22186,189.95155L560.41227,193.15707L562.92713,196.95527L565.45392,198.24889L568.5332,198.75194L569.19154,199.5843Z"},
        {id:"MN",n:"Minnesota",d:"M475.23781,128.82439L474.78056,120.36535L472.95158,113.04943L471.1226,99.560705L470.66535,89.729927L468.83637,86.300584L467.23601,81.270889L467.23601,70.982869L467.92187,67.096282L466.10094,61.644615L496.23336,61.679886L496.55668,53.435202L497.20332,53.273541L499.46657,53.758523L501.40649,54.566825L502.21479,60.063281L503.66974,66.206379L505.28634,67.822984L510.13616,67.822984L510.45948,69.277928L516.76424,69.601249L516.76424,71.702835L521.61405,71.702835L521.93737,70.409551L523.06899,69.277928L525.33224,68.631286L526.62552,69.601249L529.53541,69.601249L533.41526,72.187816L538.75006,74.612723L541.17497,75.097705L541.65995,74.127742L543.11489,73.64276L543.59987,76.552649L546.18644,77.845933L546.67142,77.360951L547.96471,77.522612L547.96471,79.624198L550.55127,80.594161L553.62282,80.594161L555.23943,79.785858L558.47264,76.552649L561.0592,76.067668L561.86751,77.845933L562.35249,79.139216L563.32245,79.139216L564.29241,78.330914L573.18374,78.007593L574.962,81.079142L575.60865,81.079142L576.32226,79.994863L580.76217,79.624198L580.15007,81.903657L576.21135,83.740782L566.96557,87.80191L562.19083,89.808807L559.11928,92.395375L556.69437,95.951905L554.43113,99.831756L552.65286,100.64006L548.12637,105.65153L546.83308,105.81319L542.5053,108.57031L540.04242,111.77542L539.8138,114.96681L539.90816,123.01016L538.53212,124.69891L533.45058,128.45888L531.2205,134.44129L534.09225,136.675L534.77214,139.90198L532.9169,143.14091L533.08769,146.88893L533.45655,153.61933L536.4848,156.62132L539.8138,156.62132L541.70491,159.75392L545.08408,160.25719L548.94324,165.92866L556.03053,170.04541L558.17368,172.92053L558.84483,179.36004L477.63333,180.50483L477.29541,144.82798L476.83817,141.85589L472.72296,138.42655L471.57984,136.59757L471.57984,134.9972L473.63744,133.39685L475.00918,132.02511L475.23781,128.82439Z"},
        {id:"OK",n:"Oklahoma",d:"M380.34313,320.82146L363.65895,319.54815L362.77873,330.50058L383.24411,331.65746L415.29966,332.96106L412.96506,357.37971L412.50781,375.21228L412.73644,376.81264L417.08027,380.4706L419.13787,381.61371L419.82374,381.38509L420.50961,379.32748L421.88135,381.15647L423.93895,381.15647L423.93895,379.78473L426.68242,381.15647L426.22518,385.04305L430.34039,385.27167L432.85523,386.41479L436.97044,387.10066L439.48529,388.92964L441.77152,386.87204L445.20086,387.5579L447.71571,390.98724L448.63019,390.98724L448.63019,393.27347L450.91642,393.95933L453.20264,391.67311L455.03163,392.35897L457.54647,392.35897L458.46097,394.87383L464.76204,396.9528L466.13378,396.26694L467.96276,392.15173L469.10587,392.15173L470.24899,394.20933L474.3642,394.8952L478.02215,396.26694L480.99425,397.18143L482.82324,396.26694L483.5091,393.75209L487.85293,393.75209L489.91053,394.66658L492.654,392.60897L493.79712,392.60897L494.48299,394.20933L498.59819,394.20933L500.19855,392.15173L502.02754,392.60897L504.08514,395.12383L507.28585,396.9528L510.48658,397.8673L512.42766,398.98623L512.03856,361.76922L510.66681,350.79524L510.50635,341.9229L509.06646,335.38517L508.28826,328.20553L508.22012,324.38931L496.08328,324.70805L449.67324,324.25081L404.63433,322.19319L380.34313,320.82146Z"},
        {id:"TX",n:"Texas",d:"M361.46423,330.57358L384.15502,331.65952L415.24771,332.80264L412.9131,356.25844L412.61634,374.41196L412.68448,376.49375L417.02831,380.31218L419.01496,381.75934L420.19917,381.19965L420.57254,379.38193L421.71286,381.18555L423.8245,381.22948L423.82183,379.78239L425.49177,380.74966L426.63047,381.15853L426.2712,385.12618L430.35939,385.21969L433.28471,386.41686L437.23945,386.94224L439.62083,389.02122L441.74493,386.94505L445.46987,387.55996L447.69078,390.7849L448.76574,391.10586L448.60527,393.07113L450.81888,393.86342L453.14903,391.80862L455.28205,392.42354L457.51143,392.45902L458.4445,394.89446L464.77259,397.00891L466.36564,396.24198L467.85511,392.06427L468.19583,392.06427L469.10232,392.14591L470.33137,394.21454L474.26125,394.87982L477.59825,396.0027L481.02388,397.19867L482.86446,396.22367L483.57822,393.70883L488.03144,393.75303L489.84018,394.68381L492.63943,392.5773L493.74307,392.6215L494.59411,394.22657L498.64883,394.22657L500.1677,392.19795L502.03507,392.60519L503.9811,395.00847L507.50167,397.05262L510.36043,397.86243L511.87405,398.66227L514.32075,400.65959L517.36379,399.3318L520.05488,400.47068L520.61869,406.57662L520.57893,416.27879L521.26479,425.8128L521.96697,429.41791L524.6423,433.83777L525.54048,438.7885L529.75643,444.32652L529.95245,447.47146L530.69882,448.2573L529.96875,456.63737L527.09665,461.64387L528.62962,463.79674L527.99954,466.13482L527.32997,473.53914L525.82565,476.87714L526.12053,480.37949L520.45565,481.96467L510.59436,486.49117L509.6244,488.43109L507.03783,490.37102L504.93625,491.82596L503.64296,492.63426L497.98485,497.96906L495.23662,500.07065L489.90182,503.30385L484.24371,505.72876L477.93895,509.12363L476.16069,510.57858L470.34091,514.13511L466.94604,514.78175L463.06619,520.2782L459.02468,520.60153L458.05471,522.54145L460.31796,524.48138L458.86301,529.97783L457.56973,534.50433L456.43811,538.38418L455.62981,542.91067L456.43811,545.33558L458.21637,552.28698L459.18634,558.43007L460.9646,561.1783L459.99464,562.63325L456.92309,564.57317L451.26497,560.69332L445.76852,559.5617L444.47523,560.04668L441.24202,559.40004L437.03885,556.32849L431.86572,555.19687L424.26767,551.802L422.16609,547.92214L420.8728,541.45573L417.6396,539.5158L416.99295,537.25255L417.6396,536.60591L417.96292,533.21104L416.66963,532.5644L416.02299,531.59444L417.31627,527.2296L415.69967,524.96636L412.46646,523.67307L409.07159,519.30824L405.51506,512.68016L401.31189,510.09359L401.47355,508.15367L396.13875,495.86747L395.33045,491.6643L393.55219,489.72438L393.39053,488.26943L387.40909,482.93464L384.82252,479.86309L384.82252,478.73146L382.23595,476.62988L375.44621,475.49825L368.00983,474.85161L364.93828,472.58837L360.41179,474.36663L356.85526,475.82158L354.59201,479.05478L353.62205,482.77298L349.25722,488.91607L346.83231,491.34098L344.24574,490.37102L342.46748,489.23939L340.52755,488.59275L336.6477,486.32951L336.6477,485.68286L334.86944,483.74294L329.6963,481.64135L322.25992,473.88165L319.99667,469.1935L319.99667,461.11047L316.76346,454.64405L316.27848,451.89583L314.66188,450.92586L313.53025,448.82428L308.51878,446.72269L307.2255,445.10609L300.11243,437.18472L298.81915,433.95151L294.13099,431.68826L292.67604,427.32339L290.08945,424.41352L288.14954,423.92856L287.50031,419.25092L295.50218,419.93681L324.53717,422.68026L353.57225,424.28062L355.80578,404.8188L359.69233,349.26378L361.29272,330.51646L362.66446,330.54504M461.69381,560.20778L461.128,553.0947L458.37976,545.90078L457.81394,538.86853L459.34972,530.62382L462.66378,523.75323L466.13948,518.33758L469.29188,514.78103L469.93852,515.02353L465.16952,521.65163L460.80468,528.19891L458.78391,534.827L458.46059,540.00016L459.34972,546.14328L461.9363,553.3372L462.42128,558.51034L462.58294,559.9653L461.69381,560.20778Z"},
        {id:"NM",n:"New Mexico",d:"M288.15255,424.01315L287.37714,419.26505L296.02092,419.79045L326.19268,422.73635L353.46084,424.42624L355.67611,405.71877L359.53347,349.8428L361.27115,330.45357L362.84285,330.58213L363.66825,319.41874L259.6638,308.78279L242.16645,429.2176L257.62712,431.20675L258.9204,421.1838L288.15255,424.01315Z"},
        {id:"KS",n:"Kansas",d:"M507.88059,324.38028L495.26233,324.58471L449.17324,324.12748L404.61576,322.06985L379.98602,320.81244L383.87981,256.21747L405.96327,256.89264L446.2524,257.73404L490.55364,258.72162L495.64927,258.72162L497.83367,260.88402L499.85133,260.86264L501.49163,261.87511L501.42913,264.88434L499.60015,266.60971L499.2679,268.84188L501.11098,272.24421L504.06334,275.43927L506.39069,277.05373L507.69146,288.29455L507.88059,324.38028Z"},
        {id:"NE",n:"Nebraska",d:"M486.09787,240.70058L489.32848,247.72049L489.19985,250.02301L492.65907,255.51689L495.37836,258.66923L490.32888,258.66923L446.84632,257.73055L406.05946,256.84025L383.80724,256.05638L384.88001,234.72853L352.56177,231.80828L356.9056,187.79842L372.45193,188.82723L392.57072,189.97033L410.40329,191.11345L434.18005,192.25656L444.92531,191.79932L446.98291,194.08554L451.78399,197.05764L452.9271,197.97213L457.27093,196.60039L461.15752,196.14315L463.90099,195.91452L465.72997,197.28626L469.7874,198.88662L472.75949,200.48698L473.21674,202.08734L474.13123,204.14494L475.96021,204.14494L476.75819,204.19111L477.65242,208.87293L480.57268,217.34085L481.14521,221.09756L483.6687,224.87181L484.23829,229.98595L485.84553,234.22632L486.09787,240.70058Z"},
        {id:"SD",n:"South Dakota",d:"M476.44687,204.02465L476.39942,203.44378L473.50371,198.59834L475.36394,193.88623L476.85667,187.99969L474.0748,185.91998L473.68964,183.17652L474.48204,180.62217L477.67055,180.63738L477.54747,175.63124L477.21417,145.45699L476.59644,141.68941L472.52412,138.35848L471.54149,136.68152L471.47899,135.0727L473.50111,133.5433L475.03333,131.87763L475.27829,129.22084L417.0212,127.62049L362.22199,124.1714L356.89672,187.86259L371.48699,188.76639L391.43684,189.972L409.17989,190.90059L432.95665,192.20417L444.93935,191.77953L446.90565,194.02471L452.10029,197.27806L452.86418,198.00081L457.40562,196.548L463.94616,195.93309L465.62146,197.26936L469.82597,198.86549L472.77103,200.50132L473.17001,201.98513L474.2095,204.22601L476.44687,204.02465Z"},
        {id:"ND",n:"North Dakota",d:"M475.30528,128.91846L474.69037,120.48479L473.01342,113.66887L471.12193,100.64465L470.66469,89.657624L468.92523,86.580482L467.16862,81.386086L467.19987,70.941816L467.82323,67.117729L465.98913,61.649968L437.34688,61.085941L418.75593,60.439299L392.24361,59.146015L369.29727,57.012146L362.30403,124.18898L417.23627,127.53263L475.30528,128.91846Z"},
        {id:"WY",n:"Wyoming",d:"M360.37668,143.27587L253.63408,129.81881L239.5506,218.27684L352.81521,231.86233L360.37668,143.27587Z"},
        {id:"MT",n:"Montana",d:"M369.20952,56.969133L338.5352,54.1613L309.27465,50.60477L280.01411,46.563258L247.68201,41.228463L229.25272,37.833593L196.52907,30.900857L192.05005,52.248389L195.47939,59.79293L194.10765,64.365382L195.93663,68.937833L199.13736,70.309572L203.75818,81.079025L206.45328,84.255548L206.91052,85.398666L210.33986,86.541784L210.79711,88.599377L203.70981,106.20333L203.70981,108.71818L206.22466,111.91889L207.13914,111.91889L211.94021,108.9468L212.62609,107.80368L214.22645,108.48955L213.99782,113.74787L216.7413,126.32212L219.71339,128.83696L220.62787,129.52283L222.45686,131.80905L221.99961,135.2384L222.68548,138.66773L223.8286,139.58223L226.11482,137.296L228.85829,137.296L232.05901,138.89636L234.57386,137.98187L238.68907,137.98187L242.34702,139.58223L245.0905,139.12498L245.54774,136.15288L248.51983,135.46702L249.89157,136.83876L250.34882,140.03947L251.77469,140.87411L253.66164,129.83937L360.40731,143.26829L369.20952,56.969133Z"},
        {id:"CO",n:"Colorado",d:"M380.03242,320.96457L384.93566,234.63961L271.5471,221.99565L259.33328,309.93481L380.03242,320.96457Z"},
        {id:"ID",n:"Idaho",d:"M148.47881,176.48395L157.24968,141.26323L158.62142,137.03371L161.13626,131.08953L159.87884,128.8033L157.36398,128.91761L156.56381,127.88881L157.02106,126.7457L157.36398,123.65929L161.82213,118.17234L163.65111,117.7151L164.79422,116.57199L165.36578,113.37127L166.28026,112.68541L170.16685,106.85553L174.05344,102.5117L174.28206,98.739432L170.85272,96.110269L169.31717,91.709286L182.94208,28.367595L196.45967,30.895706L192.05159,52.278719L195.61194,59.764071L194.03083,64.424911L196.00068,69.066144L199.1389,70.321335L202.97424,79.877923L206.48693,84.315077L206.99418,85.458195L210.33513,86.601313L210.70398,88.698388L203.73297,106.07448L203.56779,108.64041L206.19891,111.96211L207.10399,111.91321L212.01528,108.88761L212.6927,107.79264L214.25501,108.4515L213.97657,113.80522L216.71582,126.38793L220.63365,129.56584L222.31483,131.73129L221.59822,135.81515L222.66444,138.62256L223.72607,139.71384L226.20536,137.36242L229.05352,137.41131L231.97277,138.74651L234.75279,138.06458L238.54705,137.9041L242.52595,139.50446L245.26943,139.2077L245.76617,136.17039L248.69876,135.40556L249.95893,136.92147L250.39986,139.86643L251.8242,141.07964L243.4382,194.6883C243.4382,194.6883,155.47221,177.98769,148.47881,176.48395Z"},
        {id:"UT",n:"Utah",d:"M259.49836,310.10509L175.74933,298.23284L196.33694,185.69149L243.11725,194.43663L241.63245,205.06705L239.32083,218.23971L247.12852,219.16808L263.53504,220.97287L271.74601,221.82851L259.49836,310.10509Z"},
        {id:"AZ",n:"Arizona",d:"M144.9112,382.62909L142.28419,384.78742L141.96087,386.24237L142.44585,387.21233L161.36012,397.88192L173.48466,405.47996L188.19576,414.04797L205.00845,424.07092L217.29465,426.49583L242.24581,429.20074L259.50142,310.07367L175.76579,298.15642L172.6734,314.56888L171.06711,314.58419L169.35244,317.21335L166.83759,317.09903L165.58017,314.35556L162.8367,314.01263L161.9222,312.86952L161.00772,312.86952L160.09322,313.44108L158.14993,314.46988L158.03563,321.44286L157.80699,323.15753L157.23545,335.73177L155.7494,337.90368L155.17784,341.21871L157.92131,346.1341L159.17873,351.96398L159.97892,352.99278L161.00772,353.56434L160.8934,355.85056L159.29305,357.22229L155.86371,358.93696L153.92042,360.88026L152.43437,364.53821L151.86281,369.4536L149.00503,372.19707L146.94743,372.88294L147.08312,373.71282L146.62587,375.42749L147.08312,376.22767L150.74108,376.79921L150.16952,379.54269L148.68347,381.7146L144.9112,382.62909Z"},
        {id:"NV",n:"Nevada",d:"M196.39273,185.57552L172.75382,314.39827L170.92158,314.74742L169.34882,317.1536L166.97588,317.16429L165.50393,314.42082L162.88546,314.0424L162.11454,312.93477L161.07671,312.88073L158.29834,314.52502L157.98808,321.3105L157.62599,327.08767L157.27742,335.68048L155.83032,337.76964L153.3914,336.69561L84.311514,232.49442L103.30063,164.90951L196.39273,185.57552Z"},
        {id:"OR",n:"Oregon",d:"M148.72184,175.53153L157.57154,140.73002L158.62233,136.5005L160.9767,130.87727L160.36119,129.71439L157.84633,129.66821L156.56473,127.99751L157.02197,126.53344L157.52538,123.28656L161.98353,117.79961L163.81251,116.70046L164.95562,115.55735L166.44166,111.99172L170.48872,106.32232L174.05435,102.45992L174.28297,99.008606L171.01411,96.539924L169.2307,91.897299L156.56693,88.285329L141.47784,84.741679L126.04582,84.855985L125.58858,83.484256L120.10163,85.54186L115.64349,84.970301L113.24295,83.36994L111.98553,84.055815L107.29877,83.827183L105.5841,82.455454L100.32578,80.39785L99.525598,80.512166L95.181768,79.02611L93.238477,80.855093L87.065665,80.512166L81.121482,76.396957L81.807347,75.596777L82.035968,67.823604L79.749743,63.937027L75.634535,63.365468L74.94867,60.850621L72.594738,60.384056L66.796213,62.44284L64.532966,68.909258L61.299757,78.932207L58.066547,85.398626L53.055073,99.463087L46.588654,113.04256L38.505631,125.65208L36.565705,128.56197L35.757403,137.12997L36.143498,149.2102L148.72184,175.53153Z"},
        {id:"WA",n:"Washington",d:"M102.07324,7.6117734L106.43807,9.0667177L116.1377,11.814946L124.7057,13.754871L144.7516,19.412988L167.70739,25.071104L182.93051,28.278277L169.29815,91.864088L156.85315,88.33877L141.34514,84.768091L126.11585,84.801329L125.66028,83.45663L120.06106,85.635923L115.46563,84.899179L113.31866,83.315125L112.00545,83.973101L107.26979,83.832858L105.57143,82.483225L100.30839,80.370922L99.573419,80.51784L95.184297,78.993392L93.290999,80.810771L87.025093,80.512038L81.099395,76.386336L81.878352,75.453573L81.999575,67.776121L79.717576,63.93642L75.602368,63.32938L74.924958,60.818764L72.649446,60.361832L69.094498,61.592408L66.831251,58.373161L67.154572,55.463272L69.9028,55.139951L71.519405,51.09844L68.932837,49.966816L69.094498,46.248625L73.459331,45.601984L70.711103,42.853756L69.256158,35.740695L69.9028,32.830807L69.9028,24.909444L68.124535,21.676234L70.387782,12.299927L72.489368,12.784908L74.914275,15.694797L77.662503,18.281364L80.895712,20.22129L85.422205,22.322876L88.493756,22.969518L91.403645,24.424462L94.798518,25.394425L97.061764,25.232765L97.061764,22.807857L98.355048,21.676234L100.45663,20.38295L100.77996,21.514574L101.10328,23.292839L98.840029,23.77782L98.516708,25.879406L100.29497,27.334351L101.4266,29.759258L102.07324,31.699183L103.52818,31.537523L103.68984,30.244239L102.71988,28.950955L102.2349,25.717746L103.0432,23.939481L102.39656,22.484537L102.39656,20.22129L104.17483,16.66476L103.0432,14.078192L100.61829,9.2283781L100.94162,8.4200758L102.07324,7.6117734ZM92.616548,13.590738L94.637312,13.429078L95.122294,14.803197L96.658073,13.186582L99.002155,13.186582L99.810458,14.722361L98.274678,16.419801L98.92133,17.228114L98.193853,19.248875L96.819734,19.653021C96.819734,19.653021,95.930596,19.733857,95.930596,19.410536C95.930596,19.087215,97.385551,16.823958,97.385551,16.823958L95.688111,16.258141L95.36479,17.713095L94.637312,18.359737L93.10153,16.09648L92.616548,13.590738Z"},
        {id:"CA",n:"California",d:"M144.69443,382.19813L148.63451,381.70951L150.12055,379.69807L150.66509,376.75698L147.11357,376.16686L146.5994,375.49864L147.0769,373.46633L146.91762,372.87666L148.84019,372.25707L151.88297,369.42439L152.46453,364.42929L153.84443,361.02718L155.78772,358.86092L159.30659,357.27125L160.96098,355.66642L161.02971,353.55758L160.03638,352.97757L159.01323,351.90484L157.85801,346.05639L155.17281,341.2263L155.73862,337.7213L153.31904,336.69199L84.257718,232.51359L103.15983,164.9121L36.079967,149.21414L34.573071,153.94738L34.41141,161.38376L29.238275,173.18497L26.166727,175.77154L25.843406,176.90316L24.06514,177.71147L22.610196,181.91464L21.801894,185.14785L24.550122,189.35102L26.166727,193.55419L27.29835,197.11072L26.975029,203.57714L25.196764,206.64869L24.550122,212.46847L23.580159,216.18666L25.358424,220.06651L28.106652,224.593L30.369899,229.44282L31.663182,233.48433L31.339862,236.71754L31.016541,237.20252L31.016541,239.3041L36.674657,245.60886L36.189676,248.03377L35.543034,250.29702L34.896392,252.23694L35.058052,260.48163L37.159638,264.19982L39.099564,266.78638L41.847792,267.27137L42.817755,270.01959L41.686132,273.57612L39.584545,275.19273L38.452922,275.19273L37.64462,279.07258L38.129601,281.98247L41.362811,286.3473L42.979415,291.6821L44.434359,296.37025L45.727643,299.4418L49.122513,305.26158L50.577457,307.84814L51.062439,310.75803L52.679043,311.72799L52.679043,314.1529L51.870741,316.09283L50.092476,323.20589L49.607494,325.14581L52.032402,327.89404L56.235574,328.37902L60.762067,330.15729L64.641918,332.25887L67.551807,332.25887L70.461695,335.33042L73.048262,340.18024L74.179886,342.44348L78.059737,344.54507L82.909551,345.35337L84.364495,347.45496L85.011137,350.68817L83.556193,351.33481L83.879514,352.30477L87.112725,353.11307L89.860953,353.27474L93.020842,351.58789L96.900696,355.79106L97.708998,358.05431L100.29557,362.25748L100.61889,365.49069L100.61889,374.867L101.10387,376.64526L111.12682,378.10021L130.84939,380.84843L144.69443,382.19813ZM56.559218,338.48145L57.852506,340.01723L57.690846,341.31052L54.457625,341.22969L53.891811,340.01723L53.245167,338.56228L56.559218,338.48145ZM58.49915,338.48145L59.711608,337.83481L63.268151,339.9364L66.339711,341.14885L65.450575,341.79551L60.924066,341.55301L59.307456,339.9364L58.49915,338.48145ZM79.191764,358.28493L80.970029,360.62901L81.778342,361.59898L83.314121,362.16479L83.879928,360.70984L82.909965,358.93157L80.242562,356.91081L79.191764,357.07247L79.191764,358.28493ZM77.736809,366.93379L79.515085,370.08618L80.727543,372.02612L79.272589,372.2686L77.979305,371.05615C77.979305,371.05615,77.251828,369.6012,77.251828,369.19704C77.251828,368.7929,77.251828,367.01462,77.251828,367.01462L77.736809,366.93379Z"}
    ];
(function(){
    let uStates = {};
    let Paths = [];
    let toolTip;

    uStates.draw = function(id, data, toolTip){
        Paths = uStatePaths;
        this.toolTip = toolTip;
        function mouseover(d){
            let coordinates= d3.mouse(this);
            let x = coordinates[0];
            let y = coordinates[1];
            d3.select("#tooltip").transition().duration(200).style("opacity", .9);
            d3.select("#tooltip").html(toolTip(d.n, data[d.id]))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        }

        function mouseout(){
            d3.select("#tooltip").transition().duration(500).style("opacity", 0);
        }

        function onclickMap(d){
            changeFilterField('state', d.id);
        }

        let paths = d3.select(id)
            .append("g")
            .attr("transform", "translate(60,0)")
            .selectAll(".state")
            .data(Paths);
        paths.enter().append("path").attr("class", "state").attr("d", d => d.d)
            .style("fill", function(d){
                let color = filter.state.length > 1 ? data[d.id].color : colorPalette[colorPaletteName].map;
                if(!filter.state.includes(d.id)){
                    color = data[d.id].colorGray;
                }
                return color;
            })
            .style('stroke-width', '1')
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("click", onclickMap);

        paths.exit().remove();
    }

    uStates.remove = function(id){
        Paths = [];
        d3.select(id).selectAll(".state")
            .data(Paths).exit().remove();
    }

    uStatesFinal = uStates;
})();

function tooltipHtml2(n, d){    /* function to create html content string in tooltip div. */
    const billLabel = (d.count != 1 ? " Bills" : " Bill");
    return "<h4>" + n + "</h4><table>" +
        "<tr>" + (d.count) + billLabel + "</tr>"
        "</table>";
}

function drawMapPlot(dataDf){
    let plotData = {};
    let counts = dataDf.select('count');
    let groupedDf = dataDf.groupBy('state').aggregate(group => group.stat.sum('count')).rename('aggregation','count');
    rescaleGradients(groupedDf);

    // First fill with 0s
    allValuesFilter.state.forEach(function(d){
        plotData[d] = {
            count: 0,
            color: colorPalette[colorPaletteName].gradient(0),
            colorGray: colorPalette[colorPaletteName].gradient(0)
        };
    });

    groupedDf.map(function (d){
        plotData[d.get('state')] = {
            count: d.get('count'),
            color: colorPalette[colorPaletteName].gradient(d.get('count')),
            colorGray: colorPalette.none_color.gradient(d.get('count'))
        };
    });

    uStatesFinal.draw("#statesvg", plotData, tooltipHtml2);
    drawLegend();
}

function drawLegend() {
    let svg = d3.select("#statesvg");
    svg.append("g")
      .attr("class", "legendLinear")
      .attr("transform", "translate(-40,20)");

    const selectedScale = filter.state.length != 1 ? currentPaletteScale.color : currentPaletteScale.gray;

    var legend = cc.legendColor()
      .shapeWidth(15)
      .shapeHeight(15)
      .title("Number of Bills")
      .orient('vertical')
      .scale(selectedScale)
      .labels(formatLegendLabels);

    svg.select(".legendLinear")
      .call(legend);
}

export function drawPlots(data = null) {
    d3.select("#discover-text").text("");
    d3.select("#discover-title").text("");

    if (unfilteredData == null)
        // The first time we call the function, we save the original unfiltered data
        unfilteredData = data;

    // Define the default values
    colorPaletteName = 'palette';
    let filteredData = unfilteredData;

    // If we are showing only the passed bills, then filter them
    filteredData = _.filter(filteredData, d => filter.status.includes(d.status));

    // Filter the data for the chosen parties
    if (filter.party.length != allValuesFilter.party.length){
        filteredData = _.filter(filteredData, d => filter.party.includes(d.party));
        if(filter.party.length == 1){
            colorPaletteName = filter.party[0] + '_palette';
        }
    }
    // Filter the data for displayed congresses
    filteredData = _.filter(filteredData, d => filter.displayedCongresses.includes(d.congress));
    // Draw bar plot
    const congressPlotData = _.filter(filteredData, d => filter.major.includes(d.major) && filter.state.includes(d.state));
    drawCongressPlot(congressPlotData);

    // Filter the data for chosen congress
    filteredData = _.filter(filteredData, d => filter.congress == d.congress);

    // Draw horizontal bar plot
    const majorPlotData = _.filter(filteredData, d => filter.state.includes(d.state));
    drawMajorPlot(majorPlotData);

    // Filter the data for chosen majors
    filteredData = _.filter(filteredData, d => filter.major.includes(d.major));

    // Redraw map
    uStatesFinal.remove("#statesvg");
    drawMapPlot(new DataFrame(filteredData));

    // Filter the data for chosen states
    filteredData = _.filter(filteredData, d => filter.state.includes(d.state));

    drawList(new DataFrame(filteredData));
    changeText();
    showPresident();
}

function changeText(){
    d3.select('#evolution-label')
        .text( formatYear(filter['congress'])+' Congress selected');

    if(filter['state'].length>1){
        d3.select('#map-label')
            .text( multSelectedText['state']);
    } else {
        d3.select('#map-label')
            .text( statesIDsToNames[filter['state'][0]] + ' selected' );
    }
    
    if(filter['major'].length > 1){
        d3.select('#major-label')
            .text(multSelectedText['major']);
    } else {
        d3.select('#major-label')
            .text( filter['major'][0]+' selected' );
    }
}

function showPresident(){
    let div = d3.select("#president_image")
    div.selectAll("*").remove();
    console.log(congressData.find(row => row.get('congress') ==  filter['congress']))
    let path = congressData.find(row => row.get('congress') ==  filter['congress']).get('photo_president')
    var myimage = div.append('img')
    .attr('src', './img/'+path+'.jpg')

    let name = congressData.find(row => row.get('congress') ==  filter['congress']).get('pname') 
    div = d3.select("#president_name")
    div.selectAll("*").remove();
    let text = div.append('h4')
    .text(name)

    let pparty = president_party
    let party = congressData.find(row => row.get('congress') ==  filter['congress']).get('pparty') 
    if(party=='R')party='Republican'
    if(party=='D')party='Democrat'
    party += ' President'
    div = d3.select("#president_party")
    div.selectAll("*").remove();
    let p = div.append('h4')
    .text(party)

    div = d3.select('#house_info')
    party = congressData.find(row => row.get('congress') ==  filter['congress']).get('hmajorityparty') 
    
    let num = congressData.find(row => row.get('congress') ==  filter['congress']).get('hmajoritypercentage') 
    if(party=='R')party='Republican'
    if(party=='D')party='Democrat'
    div.text("HOUSE : "+party+" ( "+num+"% )")

    div = d3.select('#senate_info')
    num = congressData.find(row => row.get('congress') ==  filter['congress']).get('smajoritypercentage') 
    party = congressData.find(row => row.get('congress') ==  filter['congress']).get('smajorityparty') 
    if(party=='R')party='Republican'
    if(party=='D')party='Democrat'
    div.text("SENATE : "+party+" ( "+num+"% )")



}
function initializeIcon(filename, partyId, onclickColor){
    d3.svg("img/"+filename+'.svg').then(svg => {
        const gElement = d3.select(svg).select('g');
        const svgId = '#svg-'+partyId;
        d3.select(svgId).node().appendChild(gElement.node());
        // Define color based on the initial filter
        const color = filter.party.includes(partyId) ? onclickColor : colorPalette.none_color.partyIcon;
        d3.select(svgId).select('path').attr("fill", color);
        d3.select(svgId).on("click", () => onclickParty(partyId, onclickColor));
    });
}

function processJoinedArray(array1){
    let array_new = []
    array1.forEach(function(element) {
        array_new.push.apply(array_new, element.split(';'));
    });
    return array_new;
    }


function drawList(df){
    let ids_joined = df.toArray("id_list");
    let ids = processJoinedArray(ids_joined)
    let titles_joined = df.toArray("title_list");
    var titles = processJoinedArray(titles_joined)
    let urls_joined = df.toArray("url_list");
    var urls = processJoinedArray(urls_joined);
    let x = d3.select('#list-bills').selectAll("*").remove();
    let ul = d3.select('#list-bills').append('ul');
    d3.select('#bills_list_heading').text('Bills Currently Selected');
    function onClickList(d,i){
        let alt_url = "https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22search%22%3A%22"+titles[i]+"%22%7D&searchResultViewType=expanded"
        if(urls[i])window.open(urls[i], alt_url);
        else{
            window.open(alt_url);
        }

    }
    ul.selectAll('li')
        .data(titles)
        .enter()
        .append('li')
        .on("click", onClickList)
        .on("mouseover", function(d){
            d3.select(this).style("background-color", function() {

                return colorPalette[colorPaletteName].barPlotHover;
            });
        }).on("mouseout", function(d,i){
            let color = "#f5f5f5"
            if(i%2==0)color = "#dcdcdc"
            d3.select(this).style("background-color", function() {
                return color;
                });
            }).html(String);
}

function drawPartyLinks(){
    d3.select('#party-D')
        .on("click", () => onclickPartyLink('D', colorPalette.D_palette.partyIcon))
        //.style("color", 'black')
        .style("backgroundColor", "");
    d3.select('#party-R')
        .on("click", () => onclickPartyLink('R', colorPalette.R_palette.partyIcon))
        //.style("color", colorPalette.R_palette.partyIcon)
        .style("backgroundColor", "");
    d3.select('#party-I')
        .on("click", () => onclickPartyLink('I', colorPalette.I_palette.partyIcon))
        //.style("color", colorPalette.I_palette.partyIcon)
        .style("backgroundColor", "");
}


//////////////////////////////////////////////////////////
// Load data from csv and initialize filters
//////////////////////////////////////////////////////////
DataFrame.fromCSV("data/congress_info.csv").then(df => {discover_function(false);df.show(); congressData=df;})
d3.csv("./data/grouped_bills.csv")
    .then(data => {
        // Declare arrays to store unique read values per variable
        
        let congress = [];
        let party = [];
        let major = [];
        let state = [];
        let status = [];
        let ids = [];
        let urls = [];
        let titles = [];
        // Iterate through the data
        data.forEach(d => {
            d['count'] = +d['count'];
            congress.push(d["congress"]);
            party.push(d["party"]);
            major.push(d["major"]);
            state.push(d["state"]);
            status.push(d["status"]);
            ids.push(d["id_list"]);
            urls.push(d["url_list"]);
            titles.push(d["title_list"]);
        });

        // Set filters
        allValuesFilter.congress = Array.from(new Set(congress));
        allValuesFilter.party = Array.from(new Set(party));
        allValuesFilter.major = Array.from(new Set(major));
        allValuesFilter.state = Array.from(new Set(state));
        allValuesFilter.status = Array.from(new Set(status));

        Object.keys(allValuesFilter).forEach(key => {
            initialFilter[key] = allValuesFilter[key];
        });

        initialFilter.displayedCongresses = allValuesFilter.congress.slice(-numberCongressesDisplayed);
        initialFilter.congress = initialFilter.displayedCongresses[initialFilter.displayedCongresses.length - 1];

        Object.keys(initialFilter).forEach(key => {
            filter[key] = initialFilter[key];
        });

        let groupedData = _.groupBy(data, bg => bg['congress']);
        let billsArray = []
        let idsArray = []
        let urlsArray = []
        let titlesArray = []
        for (let cong in groupedData){
            let congData = groupedData[cong]
            let congBills = congData.map(bg => bg['count']).reduce((a,b) => a+b, 0);
            billsArray.push(congBills);
        }

        groupedData = _.groupBy(data, bg => bg['major']);
        billsArray = []
        for (let major in groupedData){
            let majorData = groupedData[major]
            let majorBills = majorData.map(bg => bg['count']).reduce((a,b) => a+b);
            billsArray.push(majorBills);
        }

        d3.select('#toggle-passed').on("click", () => togglePassed());
        d3.select('#reset-parties').on("click", () => resetFilter('party'));
        d3.select('#reset-states').on("click", () => resetFilter('state'));
        d3.select('#reset-all').on("click", () => resetFilter());
        d3.select('#discover').on("click", () => discover_function(true));
        uStatePaths.forEach(function(element) {
            statesIDsToNames[element['id']] = element['n']
        });
        drawPlots(data);
        drawPartyLinks();
        //display the home page
        //discover_function(false);
        
    });



document.addEventListener("touchstart", function(){}, true)



let discover_index = 0;

let highlight = [];

const text_discover = [
    "The number of bills introduced about topics related to Defense had been decreasing from 1991 but it started increasing again after 2001.", "This period was when the September 11 attacks took place in 2001, and two years later in 2003 the Iraq War started. This increasing tendency continued until 2009.",
    "In 2007 both congress houses changed from Republican to Democratic, resulting in an increase of bills introduced by the Democrats.", "This was especially important for Health bills, as the Affordable Care Act ('Obamacare') was signed in 2010. In 2011 the House of Representatives became majorily Republican, decreasing the number of Democratic bills.",
    'Welcome to US Senators Visualization'
]

let dict_key_div = {
    'majors':'#majors-plot',
    'evolution':'#evolution_chart',
    'map': '.section_map',
    'map_text':'#map-label',
    'evolution_text':'#evolution-label',
    'majors_text':'#major-label',
    'list-bills':'#list-bills',
    'right_table':'.table_right',
    'heading_right':'.heading_right',
    'discover_text':'.president_label'

}

const highlights_discover = [
    ['evolution','majors'],
    ['evolution','majors']
]


// Determines which text to display in the popups near the highlighted components
const description_popups = [
    [true,true],
    [false,true]
]

// Filters for each insight 
const filters_discover = [{
        congress: '110',
        state: null,
        party: null,
        major: ['Defense'],
        status: null,
        displayedCongresses: ["105","106","107","108","109","110"]        
        },
        {
        congress: '110',
        state: null,
        party: ['D'],
        major: ['Health'],
        status: null,
        displayedCongresses: ["108","109","110","111","112","113"] 

        }]


/*************************************************Functions*********************************************************/

function update_discover(highlight_, text, filters) {
    // Function triggered when the discover button is clicked. apply the 'filters' passed in parameter,
    // stores the divs 'highlight_'to be highlithed in 'highlight' and display the text in 'text' inside in the discover-text div
    if (highlight_) {
        highlight = highlight_;
    }
    // update the slider 

    if (text) {
        // display the insight

        //d3.select("#discover_text").style('opacity', "0")
          //  .html('<b>' + text + "</b>").classed("shadow_apply", true)
            //.transition().duration(1000).style('opacity', "1")

    Object.keys(filter).forEach(key => {
        if (storyFilters[key][discoverStoryNumber] != null) {
            filter[key] = storyFilters[key][discoverStoryNumber];
        } else {
            filter[key] = initialFilter[key];
        }
    });
    drawPlots();
    d3.select("#discover-text").text(storyFilters.texts[discoverStoryNumber][0])
        .append("p").text(storyFilters.texts[discoverStoryNumber][1])
        .append("img")
        .attr("src", "./img/story_"+discoverStoryNumber+".jpg")
        .attr("id", "story-image")
    d3.select("#discover-title").text(storyFilters.titles[discoverStoryNumber]);
    d3.select('#list-bills').selectAll("*").remove();
    d3.select('#bills_list_heading').text('');
    discoverStoryNumber += 1;
    discoverStoryNumber = discoverStoryNumber % storyFilters.titles.length;

    }

    // update the map and the charts
    // update filters
    changeFilterField(filters)
}
function discover_function(show_insight = true) {
    // Function triggered when the discover button is clicked

    let index = text_discover.length - 1;


    // stores the last blurred component
    let selection;

    // reset the visualization if this is not the loading page

    if (show_insight) {
        resetFilter()
        //select an insight and increment its index so we won't have the same one when we click on discover next time
        index = discover_index
        discover_index = (discover_index + 1) % (filters_discover.length)
    }


    // subfunction that adds popups near the components that we want to highlight 
    let add_popups = () => {

        highlight.forEach(function(element, sub_index) {

            // get dimensions of one of the highlithed divs
            let node_element = d3.select(dict_key_div[element]).node().getBoundingClientRect()
            let x = 0
            let y = 0

            // Define the text inside the popup.
            // This text values depends on wheter we want our user to interact with the highlighted component or not
            let text = description_popups[index][sub_index] ? 'Play with this component for further insights!' : 'See insights here'

            // Compute the coordinates of the popups depending the highlighted div
            let popup_node = d3.select('body').append('div')
                .classed('popup', true)
                .style('opacity', '0')
                .text(text)


            let pop_w = popup_node.node().getBoundingClientRect().width

            if (element == 'evolution') {
                // popup position if the highlighted div is the timechart
                x += node_element.x + node_element.width / 2 - pop_w / 2
                y += node_element.y
            } else if (element == 'major') {
                // popup position if the highlighted div is the one related to the gender or the which represent the distribution
                // of Bachelor/master/CMS/exchange students
                popup_node.style('max-width', d3.select('.table-container').node().getBoundingClientRect().x - 10 + 'px')
                pop_w = popup_node.node().getBoundingClientRect().width
                x += node_element.x - pop_w
                y += node_element.y + ((element == 'major') ? node_element.height / 2 : 0)
            } else {
                pop_w = popup_node.node().getBoundingClientRect().width
                x += node_element.x + pop_w
                y += node_element.y + node_element.height / 2
            }

            // hide the popups after 8s or when the user click on them  
            popup_node.style('top', y + 'px')
                .style('left', x + 'px')
                .style('opacity', '0.0')
                .on('click', function(e) { d3.select(this).remove() })
                .transition().duration(1000)
                .style('opacity', '1')
                .transition().delay(8000)
                .transition().duration(1000).style('opacity', 0)
                .on('end', function(e) { d3.select(this).remove() })
        });
    }



    // Blurs all visualization components
    Object.keys(dict_key_div).forEach((v) => {
        selection = d3.selectAll(dict_key_div[v])
            .style('filter', 'blur(10px)')
            .transition()
            .duration(1000)
            .style('opacity', '0.45')
            .style('pointer-events', 'none')
    })

    // get the dimension of the HTML table containing our visualization components 

    let table_contained_node = d3.select('.table-container').node().getBoundingClientRect()
    let x = table_contained_node.x + table_contained_node.width / 2
    let y = table_contained_node.y + table_contained_node.height / 2

    // create the popup containing the insight and center it on the screen
    let popup_div = d3.select('body').append('div')
        .classed('popup', true).style('top', y + 'px').style('color', '#000')
        .style('background', 'transparent')
        .style('font-size', '20pt')
        .style('width', '100%')
        .style('text-align', 'center')
        .style('margin-top', '-100px')
        .style('padding', '0px')


    // Add the insight text and a comment
    let text_spaced = text_discover[index].split(".");
    // if (show_insight)
    text_spaced = text_spaced.join("<br>")
    // else
    //     text_spaced = text_spaced[0] + text_spaced.slice(1).join("<br>")
    popup_div.append('div').html(text_spaced).classed('discover-text', 'true')

    popup_div.append('div')
        .text(show_insight ? 'Click anywhere to explore these insights!' : 'Click anywhere to start exploring!')
    popup_div.append('div').transition().duration(1000).style('opacity', 1)


    // Step triggered when the blurring transition ends for all components
    selection.on('end', () => {
        // Define an OnClick event on our HTML so that the user can disable the blur when he clicks on the screen
        d3.select('body').on('click', function(e) {
            Object.keys(dict_key_div).forEach((v) => {
                d3.selectAll('.popup').remove()
                d3.selectAll(dict_key_div[v])
                    .style('filter', 'none')
                    .style('opacity', '1')
                    .style('pointer-events', 'auto')
                if (show_insight)
                    update_discover(highlights_discover[index], text_discover[index], filters_discover[index])
                // reset the onClick function for the HTML body
                d3.select(this).on('click', () => false)
            })

            if (show_insight)
                add_popups();
        })
    })
}