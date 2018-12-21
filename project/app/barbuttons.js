import * as d3 from 'd3';

import {changeFilterField} from './main.js'

//////////////////////////////////////////////////////////
// Plotting functions
//////////////////////////////////////////////////////////

let buttonStatus={
    D:false,
    R:false,
    I:false
}
let text_colors={
    D:"#2171b5",
    R:"#cb181d",
    I:"#238b45"
}
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
    if(buttonStatus[partyId]==false){
        buttonStatus[partyId]=true;
        changeFilterField('party', partyId);
        document.getElementById('party-' + partyId).style.backgroundColor = onclickColor;
        document.getElementById('party-' + partyId).style.color = 'white';
        allValuesFilter.party.forEach(p => {
        if (p != partyId) {
            buttonStatus[p]=false;
            let otherParty = document.getElementById('party-' + p);
            otherParty.style.color = text_colors[p];
            otherParty.style.backgroundColor = '';
        }
        });
    }
    else{
        buttonStatus[partyId]=false;
        changeFilterField('party', partyId,true);
        document.getElementById('party-' + partyId).style.backgroundColor = '';
        document.getElementById('party-' + partyId).style.color = text_colors[partyId];
        //reset 

    }

    
}

export function reset_buttons(allValuesFilter,colorPalette){
    if(buttonStatus['D']==true){
        onclickPartyLink('D', colorPalette.D_palette.partyIcon, allValuesFilter);
    }
    if(buttonStatus['R']==true){
        onclickPartyLink('R', colorPalette.R_palette.partyIcon, allValuesFilter);
    }
    if(buttonStatus['I']==true){
        onclickPartyLink('I', colorPalette.I_palette.partyIcon, allValuesFilter);
    }
}
