import * as _ from 'underscore';
import * as chartjs from 'chart.js'
import * as d3 from 'd3';

import {set_congressPlot, set_majorPlot, set_maxMinVals_congress_max} from './main.js'
import {changeFilterField, resetFilter} from './main.js'
import {computeMaximumBarPlot, formatNumberBillsTick, formatYear} from './utils.js'

//////////////////////////////////////////////////////////
// Plotting functions
//////////////////////////////////////////////////////////

export function drawCongressPlot(data, colorPalette, colorPaletteName, filter, allValuesFilter, maxMinVals, congressPlot) {
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

    const maxMinVals_congress_max = Math.max(Math.max(...plotData.datasets[0].data), 1);
    set_maxMinVals_congress_max(maxMinVals_congress_max);

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
                            max: computeMaximumBarPlot(maxMinVals_congress_max),
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
        set_congressPlot(congressPlot);
    } else {
        congressPlot.data.labels = plotData.labels;
        congressPlot.data.datasets[0].data = plotData.datasets[0].data;
        congressPlot.data.datasets[0].backgroundColor = plotData.datasets[0].backgroundColor;
        congressPlot.data.datasets[0].hoverBackgroundColor = colorPalette[colorPaletteName].barPlotHover;
        congressPlot.options.scales.yAxes[0].ticks.max = computeMaximumBarPlot(maxMinVals_congress_max);
        set_congressPlot(congressPlot);
    }
}


export function drawMajorPlot(data, colorPalette, colorPaletteName, filter, allValuesFilter, maxMinVals, majorPlot) {
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
    let sorted_indexes = indexes.sort(function(a, b){
        return plotData.datasets[0].data[b] - plotData.datasets[0].data[a]
    });

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
        //TODO! is it updated?
        let ctx = document.getElementById('majors-plot');
        ctx.onclick = (evt => onclickBarPlot(majorPlot, 'major', evt));
        majorPlot = new chartjs.Chart(ctx, {
            type: 'horizontalBar',
            data: plotData,
            options: {
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
        set_majorPlot(majorPlot);
    } else {
        majorPlot.data.labels = plotData.labels;
        majorPlot.data.datasets[0].data = plotData.datasets[0].data;
        majorPlot.data.datasets[0].backgroundColor = plotData.datasets[0].backgroundColor;
        majorPlot.data.datasets[0].hoverBackgroundColor = colorPalette[colorPaletteName].barPlotHover;
        majorPlot.options.scales.yAxes[0].ticks.max = computeMaximumBarPlot(maxMinVals.major.max);
        set_majorPlot(majorPlot);
        majorPlot.update();
    }
}


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


//////////////////////////////////////////////////////////
// Define constants
//////////////////////////////////////////////////////////

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

export const yearToCongress = {
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
