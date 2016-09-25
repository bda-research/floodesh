
"use strict"

const should = require('should')
const path = require('path')
const sinon = require('sinon')
require('should-sinon')
const Worker = require('../worker')
const Client = require('../client')
const App = require('./client.js')
const bottleneck = require('mof-bottleneck')
const request = require('mof-request')
const co = require('co')

describe('worker', ()=>{
    beforeEach(() => {
	
    });

    it("should new a worker", (done)=> {
	process.chdir(path.join(process.cwd(),'tests'));
	let options = {};
	let worker = new Worker(options);
	
	worker.use((ctx, next) => {
	    console.log("before bottleneck");
	    console.log(ctx.opt);
	    return next();
	});
	
	worker.use(co.wrap(bottleneck({rate:0,concurrent:1})));
	let globalOptions = {};
	worker.use(co.wrap(request(globalOptions)));
	    
	worker.use((ctx, next) => {
	    console.log('got response %d', ctx.body.length);
	    return next();
	});

	worker.use(worker.parse());
	
	worker.use((ctx, next)=> {
	    ctx.releaseBtlneck();
	    return next();
	})
	
	new Client(require('./config.js')['production']).attach(new App()).start();
	//worker.start();
	//worker._onJob('parse')({payload:'{"uri":"http://www.baidu.com"}'});
    })
});
