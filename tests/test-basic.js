
'use strict';

const path = require('path');
process.chdir(path.join(process.cwd(),'tests'));

const should = require('should');
//const sinon = require('sinon');
//require('should-sinon');
//const App = require('./lib/client.js');
//const bottleneck = require('mof-bottleneck');
const request = require('mof-request');
//const cheerio = require('mof-cheerio');
//const iconv = require('mof-iconv');
const co = require('co');

describe('Test worker in floodesh', ()=>{
	const Worker = require('../worker');
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
		worker.exit();
	});

	it('should new a worker', ()=> {
		worker = new Worker();
		worker.should.be.an.instanceOf(Worker);
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
			console.log('middleware: %j', ctx.opt);
			should.exist(ctx.opt.retries);
			
			return next();
		});
		worker.use(co.wrap(request()));
		
		worker.on('complete', ctx=> {
			process.nextTick(()=>{
				should.exist(ctx);
				worker.exit();
				done();
			});
		});
		
		let job = {workComplete:function(){},reportError:function(){},reportWarning:function(){}};
		let ctx = {opt:{uri:'http://www.baidu.com'}, app:{},request:{}, response:{},resourceList:{},job:job};
		worker.jobs.add(job);
		worker.emit('error',getError(),ctx);
	});

	it('should emit complete even if one of middlewares do not call next', done=>{
		worker = new Worker();
		let	 number=[];
		worker.use((ctx, next)=>{
			number.push(2);
			return next();
		});
		
		worker.use((ctx, next)=>{
			should.exist(ctx);
			should.exist(next);
		});

		worker.use((ctx, next)=>{
			number.push(3);
			return next();
		});
		
		worker.on('complete',ctx=>{
			number.should.eql([1,2]);
			process.nextTick(()=>{
				should.exist(ctx);
				worker.exit();
				done();
			});
		});

		let ctx = worker.enqueue({uri:'http://www.baidu.com'});
		number.push(1);

		ctx.func='home';
		ctx.job = {workComplete:function(){}};
		worker.jobs.add(ctx.job);
	});
});
