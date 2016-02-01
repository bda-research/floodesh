
"use strict"

function testspider(){
    this.name = "testspider";
    this.seed = ["http://www.baidu.com"];
}

testspider.prototype = {
    constructor:testspider,
    onInit:function(done){
	console.log("initing...");
	done();
    },
    
    onData:function(data,done){
	if( data.length === 2 ){
	    return done();
	}
	
	let m = new Map(JSON.parse(data.toString()));
	console.log("data: %s",m.get("title"));
	done();
    },
    
    onComplete:function(tasks){
	console.log("tasks: %d",tasks.length);
    }
}

/// should be invoked in app.js file in each project.
const Client = require("../lib/client.js")

/* 
 * `new Worker()` or `just call Worker()`
 * 
 */

let config = {
    gearman:{"servers":[{"host":"192.168.98.116"}]},
    mongodb:"mongodb://192.168.98.116:27017/test"
}

new Client(config).attach(new testspider()).start();
