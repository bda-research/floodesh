
"use strict"

const fs = require('fs')

function iwjw(){
    this.name = "testapp";
    this.seed = [{opt:{uri:"http://www.baidu.com"},next:'home'}, {opt:{uri:"http://www.iwjw.com"}, next:"home"},{opt:"http://www.163.com",next:"home"}];
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
