
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
const cheerio = require('mof-cheerio')
const iconv = require('mof-iconv')
const co = require('co')

describe('Test worker in floodesh', ()=>{
    process.chdir(path.join(process.cwd(),'tests'));
    let worker;
    beforeEach(() => {
	
    });

    it('should load config file', ()=>{
	worker = new Worker();
	should.exist(worker.config.logBaseDir);
	should.exist(worker.config.retry);
	should.exist(worker.config.gearman);
	should.exist(worker.config.logger);
	should.exist(worker.config.mongodb);
	worker._exit();
    });
    
    it("should new a worker", (done)=> {
	let globalOptions = {};
	let i = 0;
	worker = new Worker();
	
	worker.use(co.wrap(bottleneck({rate:0,concurrent:1})));
	worker.use(co.wrap(request(globalOptions)));
	worker.use(iconv());
	worker.use(cheerio());
	worker.use(worker.parse());
	
	new Client(require('./config.js')['development']).attach(new App()).start();
	worker.on("complete", ()=>{
	    if(++i===3){
		worker._exit();
		done();
	    }
	});
	//worker.start();
	//worker._onJob('parse')({payload:'{"uri":"http://www.baidu.com"}'});
    });

    it('should retry when time out', done=>{
	worker = new Worker();
	let getError = ()=>{
	    let e = new Error();
	    e.code = 'ETIMEDOUT';
	    return e;
	};
	
	worker.use((ctx, next)=>{
	    should.exist(ctx.opt);
	    console.log("middleware: %j", ctx.opt);
	    should.exist(ctx.opt.retries);
	    
	    return next();
	});
	worker.use(co.wrap(request()));
	// worker.use((ctx, next)=>{
	//     let e = getError();
	//     throw e;
	//     return next();
	// });
	
	worker.on('complete', ctx=> done());
	worker.emit("error",getError(),{opt:{uri:"http://www.baidu.com"}, app:{},request:{}, response:{},job:{workComplete:function(){},reportException:function(){}}});
    });
});
