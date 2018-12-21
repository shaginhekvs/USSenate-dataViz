import * as d3 from 'd3';

import {set_currentPaletteScale} from './main.js';

//////////////////////////////////////////////////////////
// Auxiliary and formatting functions
//////////////////////////////////////////////////////////

export function formatNumberBillsTick(label) {
    label = Math.ceil(label);
    if (label >= 1000) {
        return label/1000+'k';
    } else if (Math.floor(label) == label){
        return label;
    }
}

export function computeMaximumBarPlot(count) {
    if (count < 10)
        return 10;
    const tenPower = Math.pow(10, Math.floor(Math.log10(count)));
    return tenPower * Math.ceil(count/tenPower)
}

export function formatYear(number) {
    if (number % 10 == 1 && number % 100 != 11)
        return number+'st';
    else if (number % 10 == 2 && number % 100 != 12)
        return number+'nd';
    else if (number % 10 == 3 && number % 100 != 13)
        return number+'rd';
    else
        return number+'th';
}

export function formatLegendLabels({i,genLength,generatedLabels,labelDelimiter}) {
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

export function processJoinedArray(array1){
    let array_new = []
    array1.forEach(function(element) {
        array_new.push.apply(array_new, element.split(';'));
    });
    return array_new;
}


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


//////////////////////////////////////////////////////////
// Define colors
//////////////////////////////////////////////////////////

export function wind_palette(min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#e8e5f1','#c1badb','#a899c6','#9374ad','#7e51a3','#661487'].slice(0,logRange.length))
        .domain(logRange);
    set_currentPaletteScale('color', paletteScale);
    return paletteScale
}

export function wind_gray_palette(min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#e8e8e8','#adadac','#9b9b9a','#858584','#6a6b69','#494b48'].slice(0,logRange.length))
        .domain(logRange);
    set_currentPaletteScale('gray', paletteScale);
    return paletteScale
}

export function wind_R_palette(min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#fdd6cf','#fc8472','#fb5e4a','#f0372e','#cb181d','#99000d'].slice(0,logRange.length))
        .domain(logRange);
    set_currentPaletteScale('color', paletteScale);
    return paletteScale
}

export function wind_D_palette(min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#dbebf4','#9ecae1','#6baed6','#4292c6','#2171b5','#084594'].slice(0,logRange.length))
        .domain(logRange);
    set_currentPaletteScale('color', paletteScale);
    return paletteScale
}

export function wind_I_palette(min, max) {
    const logRange = computeLogRange(min,max);
    const paletteScale = d3.scaleThreshold()
        .range(['#ffffff','#edf8e9','#a1d99b','#74c476','#41ab5d','#238b45','#005a32'].slice(0,logRange.length))
        .domain(logRange);
    set_currentPaletteScale('color', paletteScale);
    return paletteScale
}