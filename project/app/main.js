import * as d3 from 'd3';
import * as _ from 'underscore';
import DataFrame from 'dataframe-js';

import {drawPartyLinks} from './barbuttons.js'
import {drawCongressPlot, drawMajorPlot, yearToCongress} from './barplots.js'
import {discover_function} from './discovery.js';
import {drawMapPlot, uStatePaths} from './mapplot.js';
import {drawList, showPresident} from './sidebar.js';
import {computeMaximumBarPlot, formatNumberBillsTick, formatYear} from './utils.js'

require("./main.css");


//////////////////////////////////////////////////////////
// Plot and auxiliary variables
//////////////////////////////////////////////////////////

const numberCongressesDisplayed = 22;
let congressPlot = null;
let majorPlot = null;
let discover_index = 0;
let highlight = [];

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

let statesIDsToNames = {};
let unfilteredData = null;
let congressData ;
let uStatesFinal;
let currentPaletteScale = {};

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


let discoverStoryNumber = 0;

export function changeFilterField(field, value, reset=false) {
    if(reset){
        filter[field] = initialFilter[field];
        drawPlots();
        return;
    }
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

export function resetFilter(field=null) {
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
        drawPartyLinks(allValuesFilter, colorPalette);
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


//////////////////////////////////////////////////////////
// Color palettes
//////////////////////////////////////////////////////////

let colorPaletteName = 'palette';

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


//////////////////////////////////////////////////////////
// Plotting functions
//////////////////////////////////////////////////////////

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
    drawCongressPlot(congressPlotData, colorPalette, colorPaletteName, filter, allValuesFilter, maxMinVals, congressPlot);

    // Filter the data for chosen congress
    filteredData = _.filter(filteredData, d => filter.congress == d.congress);

    // Draw horizontal bar plot
    const majorPlotData = _.filter(filteredData, d => filter.state.includes(d.state));
    drawMajorPlot(majorPlotData, colorPalette, colorPaletteName, filter, allValuesFilter, maxMinVals, majorPlot);

    // Filter the data for chosen majors
    filteredData = _.filter(filteredData, d => filter.major.includes(d.major));

    // Redraw map
    if (uStatesFinal != null)
        uStatesFinal.remove("#statesvg");
    drawMapPlot(new DataFrame(filteredData), filter, allValuesFilter);

    // Filter the data for chosen states
    filteredData = _.filter(filteredData, d => filter.state.includes(d.state));

    drawList(new DataFrame(filteredData), colorPalette, colorPaletteName);
    changeText();
    showPresident(congressData, filter, colorPalette);
}


let multSelectedText = {
    major: 'All policy areas selected',
    state: 'All states selected'
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


//////////////////////////////////////////////////////////
// Load data from csv and initialize filters
//////////////////////////////////////////////////////////

DataFrame.fromCSV("data/congress_info.csv").then(df => {
    discover_function(false, initialFilter);
    congressData=df;
});

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
        d3.select('#discover').on("click", () => discover_function(true, initialFilter));
        uStatePaths.forEach(function(element) {
            statesIDsToNames[element['id']] = element['n']
        });
        drawPlots(data);
        drawPartyLinks(allValuesFilter, colorPalette);        
    });

document.addEventListener("touchstart", function(){}, true)


//////////////////////////////////////////////////////////
// Setter and getter functions
//////////////////////////////////////////////////////////

export function set_maxMinVals_congress_max(maxMinVals_congress_max){
    maxMinVals.congress.max = maxMinVals_congress_max;
}

export function set_congressPlot(cPlot){
    if (congressPlot == null) {
        congressPlot = cPlot;
    } else {
        congressPlot = cPlot;
        congressPlot.update();
    }
}

export function set_majorPlot(mPlot){
    if (majorPlot == null) {
        majorPlot = mPlot;
    } else {
        majorPlot = mPlot;
        majorPlot.update();
    }
}

export function set_discover_index(discover_idx){
    discover_index = discover_idx;
}

export function get_discover_index(){
    return discover_index;
}

export function getHighlight(){
    return highlight;
}

export function setHighlight(newvalue){
    highlight = newvalue;
}

export function get_uStatesFinal(){
    return uStatesFinal;
}

export function set_uStatesFinal(usfin){
    uStatesFinal=usfin;
}

export function set_maxMinVals_state(minval, maxval){
    if (minval != null)
        maxMinVals.state.min = minval;
    if (maxval != null)
        maxMinVals.state.max = maxval;   
}

export function setColorPaletteGradient(idx, newvalue){
    if (idx == "none_color")
        colorPalette.none_color.gradient=newvalue;
    else if (idx == "palette")
        colorPalette.palette.gradient=newvalue;
    else
        colorPalette[idx+'_palette'].gradient = newvalue;
}

export function get_currentColorPalette(){
    return colorPalette[colorPaletteName];
}

export function get_colorPalette(){
    return colorPalette;
}

export function get_currentPaletteScale(){
    return currentPaletteScale;
}

export function set_currentPaletteScale(idx, newvalue){
    if (idx == "color")
        currentPaletteScale.color = newvalue;
    else
        currentPaletteScale.gray = newvalue;
}

export function getFilter(){
    return filter;
}

export function setFilter(newvalue){
    filter = newvalue;
}

export function getDiscoverStoryNumber(){
    return discoverStoryNumber;
}

export function setDiscoverStoryNumber(newvalue){
    discoverStoryNumber = newvalue;
}