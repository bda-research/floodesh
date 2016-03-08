
"use strict"

const should = require('should')

function testspider(){
    this.name = "testspider";
}

testspider.prototype = {
    constructor:testspider,
    
    parse:function(ctx,done){
	let $ = ctx.$;
	console.log("parsing...");
	let tit = $("title").text().trim();
	ctx.dataSet.set("title",tit);
	ctx.tasks.push({opt:{uri:"http://www.163.com"},next:"parseNETEASE"});
	
	done();
    },

    parseNETEASE:function(ctx,done){
	console.log(ctx.$("title").text());
	
	done();
    }
}

/// should be invoked in app.js file in each project.
const Worker = require("../lib/worker.js")

/* 
 *  attach `testspider` instance to `Worker` instance
 *  
 */
let config = {
    gearman:{
	"servers":[{"host":"192.168.98.116"}]
    },
    schedule:{
	concurrent: 10,
	rate: 500 // ms between every request
    },
    request:{
	retry:3
    }
};

let worker = new Worker(config);
const cheerio = require("mof-cheerio");

worker.responsemw.use( (ctx,next) => {
    ctx.content = ctx.body.toString();
    return next();
})

worker.responsemw.use(cheerio())

worker.parsedmw.use( ctx => console.log("new task number: %d",ctx.tasks.length))

worker.attach(new testspider()).start();
