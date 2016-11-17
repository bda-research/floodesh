
"use strict"

const fs = require('fs')

function iwjw(){
    this.name = "testapp";
    this.seed = [{opt:{uri:"http://www.baidu.com"},next:'home'}, {opt:"http://www.sogou.com",next:"home"}];
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
	return tasks;
    },
    
    onEnd:function(){
	this.output.end();
    }
}

module.exports = iwjw;
