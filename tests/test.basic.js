
"use strict"

const should = require('should')
const path = require('path')
const sinon = require('sinon')
require('should-sinon')
const Worker = require('../worker')

describe('worker', ()=>{
    beforeEach(() => {
	
    });

    it("should new a worker", ()=> {
	process.chdir(path.join(process.cwd(),'tests'));
	let options = {functions:['parse', 'parseDetail']};
	let worker = new Worker(options);
	
	worker.use((ctx, next) => {
	    console.log(1);
	    return next();
	});
	
	worker.use((ctx, next) => {
	    console.log(2);
	    return next();
	});
	
	worker.use((ctx, next) => {
	    console.log(3);
	    return next();
	});
	
	worker.use((ctx, next) => {
	    console.log(4);
	    return next();
	});

	//worker.start();
	//worker._onJob('parse')({payload:'{"uri":"http://www.baidu.com"}'});
    })
});
