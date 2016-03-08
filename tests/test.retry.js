
"use strict"

function testspider(){
    this.name = "testspider";
    this.seed = {uri:"http://127.0.0.1:1337/",timeout:1000};
}

testspider.prototype = {
    constructor:testspider,
    onInit:function(done){
	console.log("initing...");
	done();
    },
    
    onData:function(data,done){
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
