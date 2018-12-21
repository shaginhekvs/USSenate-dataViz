import * as d3 from 'd3';

import {changeFilterField} from './main.js'

//////////////////////////////////////////////////////////
// Plotting functions
//////////////////////////////////////////////////////////

export function drawPartyLinks(allValuesFilter, colorPalette){
    d3.select('#party-D')
        .on("click", () => onclickPartyLink('D', colorPalette.D_palette.partyIcon, allValuesFilter))
        //.style("color", 'black')
        .style("backgroundColor", "");
    d3.select('#party-R')
        .on("click", () => onclickPartyLink('R', colorPalette.R_palette.partyIcon, allValuesFilter))
        //.style("color", colorPalette.R_palette.partyIcon)
        .style("backgroundColor", "");
    d3.select('#party-I')
        .on("click", () => onclickPartyLink('I', colorPalette.I_palette.partyIcon, allValuesFilter))
        //.style("color", colorPalette.I_palette.partyIcon)
        .style("backgroundColor", "");
}


//////////////////////////////////////////////////////////
// Event handlers
//////////////////////////////////////////////////////////

function onclickPartyLink(partyId, onclickColor, allValuesFilter) {
    changeFilterField('party', partyId);
    document.getElementById('party-' + partyId).style.backgroundColor = onclickColor;
    document.getElementById('party-' + partyId).style.color = 'white';

    allValuesFilter.party.forEach(p => {
        if (p != partyId) {
            let otherParty = document.getElementById('party-' + p);
            //otherParty.style.color = ;
            otherParty.style.backgroundColor = '';
        }
    });
}
