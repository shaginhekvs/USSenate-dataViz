import * as d3 from 'd3';

import {processJoinedArray} from './utils.js';

const urlPrefix = "https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22search%22%3A%22";

//////////////////////////////////////////////////////////
// Plotting functions
//////////////////////////////////////////////////////////

export function drawList(df, colorPalette, colorPaletteName){
    let ids_joined = df.toArray("id_list");
    let ids = processJoinedArray(ids_joined)
    let titles_joined = df.toArray("title_list");
    let titles = processJoinedArray(titles_joined)
    let urls_joined = df.toArray("url_list");
    let urls = processJoinedArray(urls_joined);
    let x = d3.select('#list-bills').selectAll("*").remove();
    let ul = d3.select('#list-bills').append('ul');
    d3.select('#bills_list_heading').text('Bills Currently Selected');
    function onClickList(d,i){
        let alt_url = urlPrefix+titles[i]+"%22%7D&searchResultViewType=expanded"
        if(urls[i])
            window.open(urls[i], alt_url);
        else
            window.open(alt_url);
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
            if(i % 2 == 0)color = "#dcdcdc"
            d3.select(this).style("background-color", function() {
                return color;
            });
        }).html(String);
}


export function showPresident(congressData, filter, colorPalette){
    let div = d3.select("#president_image")
    div.selectAll("*").remove();
    let path = congressData.find(row => row.get('congress') == filter['congress'])
        .get('photo_president');
    let myimage = div.append('img')
        .attr('src', './img/'+path+'.jpg');

    let name = congressData.find(row => row.get('congress') == filter['congress'])
        .get('pname');
    div = d3.select("#president_name");
    div.selectAll("*").remove();
    let text = div.append('h4')
        .text(name);

    let pparty = president_party;
    let party = congressData.find(row => row.get('congress') == filter['congress'])
        .get('pparty');
    const partyNames = {'R': 'Republican', 'D': 'Democrat'};
    let partyText = partyNames[party];
    partyText += ' President';
    div = d3.select("#president_party");
    div.selectAll("*").remove();
    let p = div.append('h4')
        .text(partyText)
        .style("color", colorPalette[party+"_palette"].partyIcon);

    div = d3.select('#house_info')
    party = congressData.find(row => row.get('congress') == filter['congress'])
        .get('hmajorityparty');
    
    let num = congressData.find(row => row.get('congress') == filter['congress'])
        .get('hmajoritypercentage');
    partyText = partyNames[party];
    div.text("HOUSE: "+num+"% "+partyText)
        .style("color", colorPalette[party+"_palette"].partyIcon);

    div = d3.select('#senate_info');
    num = congressData.find(row => row.get('congress') ==  filter['congress'])
        .get('smajoritypercentage');
    party = congressData.find(row => row.get('congress') ==  filter['congress'])
        .get('smajorityparty');
    partyText = partyNames[party];
    div.text("SENATE: "+num+"% "+partyText)
        .style("color", colorPalette[party+"_palette"].partyIcon);
}
