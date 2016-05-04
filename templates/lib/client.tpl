module.exports = `
"use strict"

const fs = require('fs')
const moment = require('moment')

function ${appName}(){
    this.name = "${appName}";
    //this.seed = ['https://www.google.com/'];
}

${appName}.prototype = {
    constructor:${appName},
    onInit:function(done){
	this.output = fs.createWriteStream("/data/${appName}/${appName}_"+moment().format("YYYY-MM-DD")+".csv");
	this.output.write('\ufeff');
	done();
    },
    initRequests:function(){// will not be invoked if seed is not empty.
	return ["https://www.google.com/","http://www.amazon.com/"];
    },
    onData:function(data,done){
	let m = new Map(JSON.parse(data.toString()));
	this.output.write(m.get('data'))
	done();
    },
    
    onComplete:function(tasks){
	console.log("tasks: %d",tasks.length);
    },
    
    onEnd:function(){
	this.output.end();
    }
}

module.exports = ${appName};
`