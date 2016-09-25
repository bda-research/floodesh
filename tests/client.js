
"use strict"

const fs = require('fs')

function iwjw(){
    this.name = "testapp";
    this.seed = ["http://www.baidu.com", "http://www.163.com", "http://www.qq.com"];
}

iwjw.prototype = {
    constructor:iwjw,
    onInit:function(done){
	done();
    },
    onData:function(data,done){
	this.output.write(data.get('data'))
	done();
    },
    
    onComplete:function(tasks){
	console.log("tasks: %d",tasks.length);
    },
    
    onEnd:function(){
	this.output.end();
    }
}

module.exports = iwjw;
