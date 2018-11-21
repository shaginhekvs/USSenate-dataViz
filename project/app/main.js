import * as d3 from 'd3';
import * as _ from 'underscore';
import * as c3 from 'c3';
import Chart from 'chart.js'

require("./main.css");

// Initial data
let unfilteredData = null;

// Initialize filters and define functions for modifying filtering
const allValuesFilter = {
    'congress': [113,114],
    'state': ['AK','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','IL','MA','MD','ME','MI','MN','NC','NH','NJ','NM','NV','NY','OH','OR','PA','RI','TN','TX','UT','VA','VT','WA','WI','WV','AR','CA','CO','CT','DC','DE','FL','GA','HI','IA','LA','MA','MD','MI','MN','MO','NH','NJ','NV','NY','OH','OR','PA','TN','TX','UT','VA','VT','WA','WI','WV'],
    'party': ['D','R'],
    'major': ['1.0','2.0','3.0','4.0','5.0','6.0','7.0','8.0','9.0','10.0','11.0','12.0','13.0','14.0','15.0','16.0','17.0','18.0','19.0','20.0','21.0','99.0']
}

const initialFilter = {
    'congress': allValuesFilter['congress'][0], // TODO: choose last one instead!
    'state':  allValuesFilter['state'],
    'party':  allValuesFilter['party'],
    'major':  allValuesFilter['major']
}

let filter = initialFilter;

function arrayRemove(array, value) {
    return array.filter(e => (e != value));
}

function addFilterField(field, value) {
    // TODO: If no party chosen, both are chosen
    if (field == 'congress') {
        if (value != filter['congress']) {
            filter['congress'] = value;
            drawPlots();
        }
    }
    else {
        if (filter[field].includes(value))
            filter[field] = arrayRemove(filter[field], value);
        else
            filter[field].push(value);
        drawPlots();
    }
}

function resetFilter() {
    filter = initialFilter;
    drawPlots();
}

// Size/Resizing functions and definitions... (TODO)
// TODO:  $(window).on('resize', function() {whatever happens when resizing the window}

// Plotting variables
let barPlot = null;
let horizontalBarPlot = null;

// Plotting functions (TODO: Save in separate files!)
function drawCongressPlot(data) {
    const billsPerCongress = _.groupBy(data, bg => bg['congress']);
    let plotData = [['congress'], ['Number of bills introduced']];
    allValuesFilter['congress'].forEach(congress => {
        plotData[0].push(congress);
        const bills = billsPerCongress[congress];
        if (bills == null) {
            plotData[1].push(0);
        } else {
            let numberBills = bills.map(bg => bg['count']).reduce((a,b) => a+b, 0);
            plotData[1].push(numberBills);
        }
    });
    if (barPlot == null) {
        barPlot = c3.generate({
            data: {
                x: 'congress',
                columns: plotData,
                type: 'bar',
                onclick: c => {
                    addFilterField('congress', c.x);
                }
            },
            axis: {
                x: {
                    show: true/*,
                    min: Math.min(allValuesFilter['congress']),
                    max: Math.max(allValuesFilter['congress'])*/
                },
                y: {
                    tick: {
                        // format: TODO: formatting function for numbers,
                        count: 3
                    }
                }
            },
            legend: {
                show: false
            },
            color: {
                pattern: ['#888888']
            },
            bindto: '.bar-plot'
        });
    } else {
        barPlot.load({
            columns: plotData
        });
    }
}

function drawMajorPlot(data) {
    const billsPerMajor = _.groupBy(data, bg => bg['major']);
    let plotData = {
        labels: [],
        datasets: [{
            label: 'Number of bills',
            data: [],
            backgroundColor: [],
            hoverBackgroundColor: []
        }]
    };

    allValuesFilter['major'].forEach(major => {
        const bills = billsPerMajor[major];
        if (bills != null) {
            plotData.labels.push(major);
            let numberBills = bills.map(bg => bg['count']).reduce((a,b) => a+b, 0);
            plotData.datasets[0].data.push(numberBills);
        }
        // TODO: Confirm that we don't want to show 0's in this plot
        // else {
        //     plotData[0].push(major);
        //     plotData[1].push(0);
        // }
    });
    if (horizontalBarPlot == null) {
        let ctx = document.getElementById('majors-plot');
        horizontalBarPlot = new Chart(ctx, {
            type: 'horizontalBar',
            data: plotData,
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    xAxes: [{
                        ticks: {
                            min: 0,
                            beginAtZero: true,

                        },
                        afterBuildTicks: function(chart) {}
                    }],
                    yAxes: [{
                        gridLines: { display: false },
                        ticks: {
                            mirror: true,
                        }

                    }]
                },
                legend: {
                    display: false
                },
                tooltips: {
                    callbacks: {

                    }
                }
            }
        });
    } else {
        horizontalBarPlot.load({
            columns: plotData
        });
    }
}

function displayPartyRatios(data) {
    let plotData = [['party'], ['Number of bills introduced'], ['Percentage']];
    if (filter['party'].length != 1) {
        // Both parties are selected
        // We need to groupBy and count separately, and save it in plotData
        const billsPerParty = _.groupBy(data, bg => bg['party']);
        allValuesFilter['party'].map(party => {
            plotData[0].push(party);
            let bills = billsPerMajor[party];
            if (bills == null) {
                plotData[1].push(0);
                plotData[2].push(0);
            } else {
                let numberBills = bills.map(bg => bg['count']).reduce((a,b) => a+b, 0);
                plotData[1].push(numberBills);
                plotData[2].push(numberBills); //TODO: Compute percentage instead!
            }
        });
    } else {
        // Only one party is selected, and data contains bills only for this party
        for (let party in allValuesFilter['party']) {
            plotData[0].push(party);
            if (party == filter['party'][0]) {
                let numberBills = data.map(bg => bg['count']).reduce((a,b) => a+b, 0);
                plotData[1].push(numberBills);
                plotData[2].push(numberBills); //TODO: Compute percentage instead!
            } else {
                plotData[1].push(0);
                plotData[2].push(0);
            }
        }
    }

    d3.select('.bills-D').text(plotData[1][0] + " (" + plotData[2][0]) + "%)";
    d3.select('.bills-R').text(plotData[1][1] + " (" + plotData[2][1]) + "%)";
    
    // TODO: Color svgs
}

export function drawPlots(data = null) {
    // TODO: Keep track of what changed and what needs to be updated in the plots!
    if (unfilteredData == null) {
        unfilteredData = data;
    }

    // TODO: Don't reset filteredData to unfilteredData every time!
    let filteredData = unfilteredData;
    // Filter the data for chosen parties
    if (filter['party'].length == 1)
        filteredData = _.filter(filteredData, d => filter['party'].includes(d['party']));

    // Draw bar plot
    const congressPlotData = _.filter(filteredData, d => filter['major'].includes( d['major']) && filter['state'].includes(d['state']) );
    drawCongressPlot(congressPlotData);

    // Filter the data for chosen congress
    filteredData = _.filter(filteredData, d => filter['congress'] == d['congress']);

    // Draw horizontal bar plot
    const majorPlotData = _.filter( filteredData, d => filter['state'].includes(d['state']) );
    drawMajorPlot(majorPlotData);

    // Filter the data for chosen majors
    filteredData = _.filter(filteredData, d => filter['major'].includes(d['major']));

    // Draw map
    // drawMapPlot(filteredData);

    // Filter the data for chosen states
    filteredData = _.filter(filteredData, d => filter['state'].includes(d['state']));
    
    // Display percentages per party
    // displayPartyRatios(filteredData);

    // TODO: We need labels depending on info being shown?
    // showYear()
    // showMajors()
    // showTitle()
}


// Load ISA data from csv
d3.csv("./data/grouped_bills.csv", data => {
    data.forEach(d => d['count'] = +d['count']);
    drawPlots(data);
});