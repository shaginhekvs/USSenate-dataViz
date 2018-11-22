let color_scale ;
let data;
let policy_data;
let DataFrame = dfjs.DataFrame;
	function tooltipHtml(n, d){	/* function to create html content string in tooltip div. */
		return "<h4>"+n+"</h4><table>"+
			"<tr><td>Low</td><td>"+(d.low)+"</td></tr>"+
			"<tr><td>Average</td><td>"+(d.avg)+"</td></tr>"+
			"<tr><td>High</td><td>"+(d.high)+"</td></tr>"+
			"</table>";
	}

	var sampleData ={};	/* Sample random data. */	
	["HI", "AK", "FL", "SC", "GA", "AL", "NC", "TN", "RI", "CT", "MA",
	"ME", "NH", "VT", "NY", "NJ", "PA", "DE", "MD", "WV", "KY", "OH", 
	"MI", "WY", "MT", "ID", "WA", "DC", "TX", "CA", "AZ", "NV", "UT", 
	"CO", "NM", "OR", "ND", "SD", "NE", "IA", "MS", "IN", "IL", "MN", 
	"WI", "MO", "AR", "OK", "KS", "LS", "VA"]
		.forEach(function(d){ 
			var low=Math.round(100*Math.random()), 
				mid=Math.round(100*Math.random()), 
				high=Math.round(100*Math.random());
			sampleData[d]={low:d3.min([low,mid,high]), high:d3.max([low,mid,high]), 
					avg:Math.round((low+mid+high)/3), color:d3.interpolate("#ffffcc", "#800026")(low/100)}; 
		});
	
	/* draw states on id #statesvg */	
	//uStates.draw("#statesvg", sampleData, tooltipHtml);
	

	function palette(min, max) {
    let d = (max-min)/100;
    return d3.scale.threshold()
        .range(['#ffffff','#fdfdfd','#fafafa','#f6f6f6','#f4f4f4','#f0f0f0','#ededed','#eaeaea','#e8e8e8','#e4e4e4','#e3e3e3','#dfdfdf','#dcdcdc','#dadada','#d7d7d7','#d3d3d3','#d1d1d1','#cecece','#cccccc','#c8c8c8','#c6c6c6','#c3c3c3','#c0c0c0','#bebebe','#bababa','#b7b7b7','#b6b6b6','#b3b3b3','#afafaf','#adadad','#aaaaaa','#a7a7a7','#a5a5a5','#a3a3a3','#9f9f9f','#9c9c9c','#9b9b9b','#979797','#949494','#929292','#909090','#8d8d8d','#8b8b8b','#888888','#858585','#828282','#7f7f7f','#7e7e7e','#7a7a7a','#787878','#757575','#747474','#717171','#6f6f6f','#6b6b6b','#696969','#676767','#656565','#616161','#606060','#5c5c5c','#5a5a5a','#575757','#555555','#545454','#505050','#4e4e4e','#4c4c4c','#494949','#474747','#454545','#434343','#404040','#3f3f3f','#3c3c3c','#3a3a3a','#373737','#353535','#333333','#313131','#2f2f2f','#2c2c2c','#2b2b2b','#292929','#262626','#242424','#212121','#1f1f1f','#1d1d1d','#1c1c1c','#191919','#181818','#151515','#131313','#101010','#0f0f0f','#0b0b0b','#070707','#040404','#000000'])
        .domain([min+1*d,min+2*d,min+3*d,min+4*d,min+5*d,min+6*d,min+7*d,min+8*d,min+9*d,min+10*d,min+11*d,min+12*d,min+13*d,min+14*d,min+15*d,min+16*d,min+17*d,min+18*d,min+19*d,min+20*d,min+21*d,min+22*d,min+23*d,min+24*d,min+25*d,min+26*d,min+27*d,min+28*d,min+29*d,min+30*d,min+31*d,min+32*d,min+33*d,min+34*d,min+35*d,min+36*d,min+37*d,min+38*d,min+39*d,min+40*d,min+41*d,min+42*d,min+43*d,min+44*d,min+45*d,min+46*d,min+47*d,min+48*d,min+49*d,min+50*d,min+51*d,min+52*d,min+53*d,min+54*d,min+55*d,min+56*d,min+57*d,min+58*d,min+59*d,min+60*d,min+61*d,min+62*d,min+63*d,min+64*d,min+65*d,min+66*d,min+67*d,min+68*d,min+69*d,min+70*d,min+71*d,min+72*d,min+73*d,min+74*d,min+75*d,min+76*d,min+77*d,min+78*d,min+79*d,min+80*d,min+81*d,min+82*d,min+83*d,min+84*d,min+85*d,min+86*d,min+87*d,min+88*d,min+89*d,min+90*d,min+91*d,min+92*d,min+93*d,min+94*d,min+95*d,min+96*d,min+97*d,min+98*d,min+99*d,min+100*d]);
	}

	function R_palette(min, max) {
    let d = (max-min)/50;
    return d3.scale.threshold()
        .range(['#ffffe0','#fffad6','#fff5cc','#ffefc2','#ffeaba','#ffe5b2','#ffe0ab','#ffdaa3','#ffd59c','#ffd095','#ffca90','#ffc58a','#ffbf85','#ffb880','#ffb27c','#ffad78','#ffa775','#ffa072','#ff9a6e','#ff936b','#fd8d6a','#fb8768','#f98266','#f87c64','#f57762','#f37160','#f06b5f','#ee655d','#eb5f5b','#e85959','#e55457','#e14e55','#de4952','#da4450','#d73e4d','#d3394a','#ce3347','#ca2e43','#c52940','#c1243c','#bc1f38','#b71a34','#b3152f','#ae112a','#a80b24','#a2071f','#9c0418','#970112','#92010b','#8b0000'])
        .domain([min+1*d,min+2*d,min+3*d,min+4*d,min+5*d,min+6*d,min+7*d,min+8*d,min+9*d,min+10*d,min+11*d,min+12*d,min+13*d,min+14*d,min+15*d,min+16*d,min+17*d,min+18*d,min+19*d,min+20*d,min+21*d,min+22*d,min+23*d,min+24*d,min+25*d,min+26*d,min+27*d,min+28*d,min+29*d,min+30*d,min+31*d,min+32*d,min+33*d,min+34*d,min+35*d,min+36*d,min+37*d,min+38*d,min+39*d,min+40*d,min+41*d,min+42*d,min+43*d,min+44*d,min+45*d,min+46*d,min+47*d,min+48*d,min+49*d,min+50*d]);
	}

	function D_palette(min, max) {
    let d = (max-min)/50;
    return d3.scale.threshold()
        .range(['#ffffe0','#fdfae1','#faf5e2','#f7f0e3','#f5ebe4','#f2e7e5','#f0e2e6','#eddde7','#ead9e8','#e7d4e9','#e5d0e9','#e2caea','#dfc5eb','#dcc1ec','#d9bced','#d6b7ed','#d3b2ee','#d0afef','#cdaaf0','#c9a5f0','#c6a1f1','#c39cf2','#bf97f2','#bc92f3','#b88df3','#b489f4','#b184f5','#ad7ff5','#a97bf6','#a676f6','#a171f7','#9d6df7','#9968f8','#9464f8','#8f5ff9','#8b5af9','#8656fa','#8151fa','#7c4bfb','#7646fb','#7041fc','#693cfc','#6337fc','#5c31fd','#542bfd','#4b25fe','#411ffe','#3517fe','#230dff','#0000ff'])
        .domain([min+1*d,min+2*d,min+3*d,min+4*d,min+5*d,min+6*d,min+7*d,min+8*d,min+9*d,min+10*d,min+11*d,min+12*d,min+13*d,min+14*d,min+15*d,min+16*d,min+17*d,min+18*d,min+19*d,min+20*d,min+21*d,min+22*d,min+23*d,min+24*d,min+25*d,min+26*d,min+27*d,min+28*d,min+29*d,min+30*d,min+31*d,min+32*d,min+33*d,min+34*d,min+35*d,min+36*d,min+37*d,min+38*d,min+39*d,min+40*d,min+41*d,min+42*d,min+43*d,min+44*d,min+45*d,min+46*d,min+47*d,min+48*d,min+49*d,min+50*d]);
	}

	function I_palette(min, max) {
    let d = (max-min)/50;
    return d3.scale.threshold()
        .range(['#ffffe0','#fbfcdc','#f6fad7','#f2f7d3','#edf5ce','#e9f2ca','#e4efc6','#dfedc0','#dceabd','#d7e7b8','#d2e5b4','#cee2b0','#c9e0ab','#c5dda7','#c1dba2','#bcd89d','#b8d69a','#b3d295','#afd192','#aace8d','#a6cb88','#a2c985','#9dc680','#99c37d','#94c078','#90be73','#8bbb70','#86b96b','#83b767','#7db363','#79b15f','#75af5b','#70ac56','#6caa52','#66a74e','#62a44a','#5da145','#589f42','#539c3d','#4e9938','#4a9835','#439430','#3f922c','#389027','#328d21','#2c8a1d','#248816','#1d8611','#108308','#008000'])
        .domain([min+1*d,min+2*d,min+3*d,min+4*d,min+5*d,min+6*d,min+7*d,min+8*d,min+9*d,min+10*d,min+11*d,min+12*d,min+13*d,min+14*d,min+15*d,min+16*d,min+17*d,min+18*d,min+19*d,min+20*d,min+21*d,min+22*d,min+23*d,min+24*d,min+25*d,min+26*d,min+27*d,min+28*d,min+29*d,min+30*d,min+31*d,min+32*d,min+33*d,min+34*d,min+35*d,min+36*d,min+37*d,min+38*d,min+39*d,min+40*d,min+41*d,min+42*d,min+43*d,min+44*d,min+45*d,min+46*d,min+47*d,min+48*d,min+49*d,min+50*d]);
	}






	function tooltipHtml2(n, d){	/* function to create html content string in tooltip div. */
		return "<h4>"+n+"</h4><table>"+
			"<tr><td>Count</td><td>"+(d.count)+"</td></tr>"
			"</table>";
	}

	function join2dfs(){
		policy_data=policy_data.rename('0','major');
		policy_data = policy_data.rename('1','policy')
		policy_data = policy_data.map(row=>row.set('major',row.get('major')+'.0'))
		data = data.join(policy_data,'major','full')
		data = data.replace(undefined,'others','policy')

	}

	function on_data_loaded(df){
		data = df
		draw_map(data)
		console.log(df.unique('congress').show());
		//drawList(df.unique('congress').toArray(),congressClick);
		//drawList(df.unique('party').toArray(),partyClick);
		//drawList(df.unique('major').toArray(),majorClick);
	}

	function draw_map(df){
		console.log(df)

		let data_dict = {}
		counts = df.select('count')
		df_new = df.groupBy('state').aggregate(group => group.stat.sum('count')).rename('aggregation','count');	
		let color = 'palette'
		let parties= df.unique('party').toArray()
		if(parties.length == 1){
			color = parties[0]+'_'+color;
		}
		console.log(color)
		df_new.show()
		console.log(df_new.count())
		let maxval = 0
		if(df_new.count()>0) {
			maxval = df_new.stat.max('count');
		}
		color_scale = window[color](0,maxval+1)
		var array1 = ["HI", "AK", "FL", "SC", "GA", "AL", "NC", "TN", "RI", "CT", "MA",
		"ME", "NH", "VT", "NY", "NJ", "PA", "DE", "MD", "WV", "KY", "OH", 
		"MI", "WY", "MT", "ID", "WA", "DC", "TX", "CA", "AZ", "NV", "UT", 
		"CO", "NM", "OR", "ND", "SD", "NE", "IA", "MS", "IN", "IL", "MN", 
		"WI", "MO", "AR", "OK", "KS", "LS", "VA"]
		array1.forEach(function(d){ 
			data_dict[d]={count:0,color:color_scale(0)}
		});

		

		df_new.map(function (d){
			data_dict [d.get('state')]={count:d.get('count'),color:color_scale(d.get('count'))}
		});

		console.log(data_dict)
		uStates.draw("#statesvg", data_dict, tooltipHtml2);

	}
	export function read_data(){
		DataFrame.fromCSV('data/policy_agenda.csv',header = false).then(function(df){
			policy_data = df
		}).then(df=>DataFrame.fromCSV('data/grouped_bills.csv')).then(df=>on_data_loaded(df));

	}
	
	function congressClick(d){
		addFilterField('Congress',d);
		data_new = filter_data_congress(data);
		uStates.remove("#statesvg");
		draw_map(data_new);

	}

	function filter_data_congress(d){
		console.log( filter['Congress'][0])
		return d.filter(row => row.get('congress') == filter['Congress'][0].toString())
	}

	function filter_major(d){
		let df =  d.filter(row=> filter['Subject'].includes( row.get('major')));
		console.log(df.show())
		return df
	}
	function majorClick(d){
		console.log('logging filter');
		addFilterField('Subject',d)
		console.log(filter)

		data_new = filter_data_congress(filter_major(data));
		uStates.remove("#statesvg");
		draw_map(data_new);

	}
	function filter_party(d){
		let df = d;
		console.log(filter['Party'])
		if(filter['Party'].length==1){
		df =  d.filter(row=> filter['Party'].includes( row.get('party')));
		}
		df.show();
		return df
	}
	function partyClick(d){
		console.log(d)
		addFilterField('Party',d);

		data_new = filter_data_congress(filter_party(data));
		uStates.remove("#statesvg");
		draw_map(data_new);

	}
	function drawList(data,callback){
		let ul = d3.select('body').append('ul');
			ul.selectAll('li')
			.data(data)
			.enter()
			.append('li')
			.html(String).on("click",callback);
	}
	read_data()


