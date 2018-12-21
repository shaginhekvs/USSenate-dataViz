import * as d3 from 'd3';

import {changeFilterField, get_discover_index, set_discover_index} from './main.js'
import {setHighlight, getHighlight, resetFilter, drawPlots} from './main.js'
import {getFilter, setFilter, getDiscoverStoryNumber, setDiscoverStoryNumber} from './main.js'

//////////////////////////////////////////////////////////
// Define constants
//////////////////////////////////////////////////////////

const filtersDiscover = [
    {
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
    },
    {
        congress: "113",
        party: null,
        state: ['AK'],
        major: ["Public Lands", "Energy", "Environment"],
        status: null,
        displayedCongresses: ["108","109","110","111","112","113"],        
    },
    {
        congress: "113",
        party: null,
        state: null,
        major: ['Immigration'],
        status: null,
        displayedCongresses: ["108","109","110","111","112","113","114","115"],        
    }
];

const storyFilters = [
    {
        titles: "Defense bills after September 11",
        texts: ["The number of bills introduced about topics related to Defense had been decreasing from 1991 but it started increasing again after 2001.",
                "This period was when the September 11 attacks took place in 2001, and two years later in 2003 the Iraq War started. This increasing tendency continued until 2009."],
    },
    {
        titles: "Health related bills introduced by the Democratic Party",
        texts: ["In 2007 both congress houses changed from Republican to Democratic, resulting in an increase of bills introduced by the Democrats.",
                "This was especially important for Health bills, as the Affordable Care Act ('Obamacare') was signed in 2010. In 2011 the House of Representatives became majorily Republican, decreasing the number of Democratic bills."],
    },
    {
        titles: "Public land bills in Alaska",
        texts: ["Policy areas related with Public Lands, Energy and Environment have consistently been in the top five policy areas that congress members representing Alaska have contributed to.",
                "There is a large area available in Alaska to be managed and that allow to build energy centrals. There are also many native tribes, and bills related with native settlements are included in the Public Lands policy area."],
    },
    {
        titles: "Immigration bills influx since 2013",
        texts: ["Immigration bills influx happened since 2013.",
                "Before 2013 no new bills were introduced to revise immigration policy of US. On June 27, 2013, the United States Senate approved S.744, known as the Border Security, Economic Opportunity, and Immigration Modernization Act of 2013 in a historic 68-to-32 vote."],
    },
];

const highlightsDiscover = [
    ['evolution','majors','discover_text'],
    ['evolution','majors','discover_text'],
    ['evolution','map','discover_text'],
    ['evolution','majors','discover_text']
];


const textDiscover = [
    "Defense Insight.",
    "HealthCare Insight ",
    "Alaska Insight",
    "Immigration Laws Insights",
    'Welcome to Visualization of Bills in US Congress'
];

const dictionaryKeysDiv = {
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

};

// Determines which text to display in the popups near the highlighted components
const description_popups = [
    [true,true,false],
    [false,true,false],
    [true,true,false],
    [false,false,false]
]


//////////////////////////////////////////////////////////
// Function for displaying stories
//////////////////////////////////////////////////////////

export function discover_function(showInsight=true, initialFilter) {
    // Function triggered when the discover button is clicked
    let index = textDiscover.length - 1;
    const highlight = getHighlight();

    // stores the last blurred component
    let selection;

    if (showInsight) {
        // reset the visualization
        resetFilter();
        let storyIndex = get_discover_index();
        //select a story and increment the index for next time
        index = storyIndex;
        storyIndex = (storyIndex + 1) % (filtersDiscover.length);
        set_discover_index(storyIndex);
        updateDiscover(highlightsDiscover[index], textDiscover[index], filtersDiscover[index], initialFilter);
    }

    // subfunction that adds popups near the components that we want to highlight 
    let addPopups = () => {
        highlight.forEach(function(element, sub_index) {
            // get dimensions of one of the highlithed divs
            let nodeElement = d3.select(dictionaryKeysDiv[element]).node().getBoundingClientRect();
            let x = 0;
            let y = 0;

            // Define the text inside the popup.
            // This text values depends on wheter we want our user to interact with the highlighted component or not
            let text = description_popups[index][sub_index] ? 'Play with this component for further insights!' : 'See insights here';

            // Compute the coordinates of the popups depending the highlighted div
            let popupNode = d3.select('body').append('div')
                .classed('popup', true)
                .style('opacity', '0')
                .text(text);

            let popWidth = popupNode.node().getBoundingClientRect().width;

            if (element == 'evolution') {
                // popup position if the highlighted div is the timechart
                x += nodeElement.x + nodeElement.width / 2 - popWidth / 2;
                y += nodeElement.y;
            } else if (element == 'major') {
                // popup position if the highlighted div is the one related to the gender or the which represent the distribution
                // of Bachelor/master/CMS/exchange students
                popupNode.style('max-width', d3.select('.table-container').node().getBoundingClientRect().x - 10 + 'px');
                popWidth = popupNode.node().getBoundingClientRect().width;
                x += nodeElement.x - popWidth;
                y += nodeElement.y + ((element == 'major') ? nodeElement.height / 2 : 0);
            } else if (element == 'discover_text') {
                popWidth = popupNode.node().getBoundingClientRect().width;
                x += nodeElement.x - popWidth;
                y += nodeElement.y + nodeElement.height / 2;
            }
            else {
                popWidth = popupNode.node().getBoundingClientRect().width;
                x += nodeElement.x + popWidth;
                y += nodeElement.y + nodeElement.height / 2;
            }

            // Popups disappear after 8s or when the user clicks on them  
            popupNode.style('top', y + 'px')
                .style('left', x + 'px')
                .style('opacity', '0.0')
                .on('click', function(e) { d3.select(this).remove() })
                .transition().duration(1000)
                .style('opacity', '1')
                .transition().delay(3000)
                .transition().duration(1000).style('opacity', 0)
                .on('end', function(e) { d3.select(this).remove() });
        });
    }

    // Blur everything in the visualization
    Object.keys(dictionaryKeysDiv).forEach((v) => {
        selection = d3.selectAll(dictionaryKeysDiv[v])
            .style('filter', 'blur(10px)')
            .transition()
            .duration(1000)
            .style('opacity', '0.45')
            .style('pointer-events', 'none');
    });

    // get the dimension of the HTML table containing our visualization components 

    let tableContainedNode = d3.select('.table-container').node()
        .getBoundingClientRect();
    let x = tableContainedNode.x + tableContainedNode.width / 2;
    let y = tableContainedNode.y + tableContainedNode.height / 2;

    // create the popup containing the insight and center it on the screen
    let popupDiv = d3.select('body').append('div')
        .classed('popup', true).style('top', y + 'px').style('color', '#000')
        .style('background', 'transparent')
        .style('font-size', '20pt')
        .style('width', '100%')
        .style('text-align', 'center')
        .style('margin-top', '-100px')
        .style('padding', '0px')


    // Add the text
    let spacedText = textDiscover[index].split(".");
    spacedText = spacedText.join("<br>");
    popupDiv.append('div').html(spacedText).classed('discover-text', 'true');

    popupDiv.append('div')
        .text(showInsight ? "Click on Discover for a new fact" : "Use the buttons to show only passed bills or to discover interesting facts")
        .append('div')
        .text("Modify the filtering criteria by clicking on the plots")
        .append('div')
        .text(showInsight ? "Use the Reset button to go back to the start" : "Click on a bill on the right to learn more about it")
        .append('div')
        .text("-")
        .append('div')
        .text(showInsight ? 'Click anywhere to explore these insights!' : 'Click anywhere to start exploring!');
    popupDiv.append('div').transition().duration(1000).style('opacity', 1);

    // Starts after blur effect ends
    selection.on('end', () => {
        // onclick event ends blur after a click
        d3.select('body').on('click', function(e) {
            Object.keys(dictionaryKeysDiv).forEach((v) => {
                d3.selectAll('.popup').remove();
                d3.selectAll(dictionaryKeysDiv[v])
                    .style('filter', 'none')
                    .style('opacity', '1')
                    .style('pointer-events', 'auto');
                // reset onclick function
                d3.select(this).on('click', () => false);
            });

            if (showInsight)
                addPopups();
        });
    });
}

function updateDiscover(highlight_, text, filters, initialFilter) {
    // Function triggered when the discover button is clicked. apply the 'filters' passed in parameter,
    // stores the divs 'highlight_'to be highlithed in 'highlight' and display the text in 'text' inside in the discover-text div
    
    if (highlight_){
        setHighlight(highlight_);
    }

    let filter = getFilter();

    // update the slider 
    if (text) {
        let discoverStoryNumber = getDiscoverStoryNumber();

        Object.keys(filter).forEach(key => {
            if (filtersDiscover[discoverStoryNumber][key] != null) {
                filter[key] = filtersDiscover[discoverStoryNumber][key];
            } else {
                filter[key] = initialFilter[key];
            }
        });
        drawPlots();
        d3.select("#discover-text").text(storyFilters[discoverStoryNumber].texts[0])
            .append("p").text(storyFilters[discoverStoryNumber].texts[1])
            .append("img")
            .attr("src", "./img/story_"+discoverStoryNumber+".jpg")
            .attr("id", "story-image")
        d3.select("#discover-title").text(storyFilters[discoverStoryNumber].titles);
        d3.select('#list-bills').selectAll("*").remove();
        d3.select('#bills_list_heading').text('');

        discoverStoryNumber += 1;
        discoverStoryNumber = discoverStoryNumber % storyFilters.length;
        setDiscoverStoryNumber(discoverStoryNumber);
        setFilter(filter);
    }

    // update the map and the charts
    // update filters
    changeFilterField(filters)
}
