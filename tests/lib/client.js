
"use strict"

const Client = require('../../client/')

class Iwjw extends Client{
    constructor(){
	super();
	this.name = "testapp";
	this.seed = [{opt:{uri:"http://www.baidu.com"},next:'home'}, {opt:"http://www.sogou.com",next:"home"}];
	this.on('init',(done)=> this.onInit(done))
	    .on('data',(data,done) => this.onData(data,done))
	    .on('complete',tasks=>this.onComplete(tasks))
	    .on('exit',()=>this.onEnd());
    }

    onInit(done){
	done();
    }
    
    onData(data,done){
	done();
    }
    
    onComplete(tasks){
	return tasks;
    }
    
    onEnd(){
	
    }
}

module.exports = Iwjw;
