
'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const App = require('./lib/client.js');
const Status = require('./lib/status.js');

describe('Test client in floodesh', ()=>{
	let app;
	beforeEach(() => {
		app = new App();
	});

	it('should load config file', ()=>{
		should.exist(app.config.logBaseDir);
		should.exist(app.config.gearman);
		should.exist(app.config.logger);
		should.exist(app.config.mongodb);
	});

	it('should use seed in client',()=>{
		app._init = sinon.spy();
		app.start();
		app._init.should.be.calledOnce();
		app.seed.length.should.be.equal(2);
	});
	
	it('should load seed file if no specified seed ',()=>{
		delete app.seed;
		app._init = sinon.spy();
		app.start();
		app._init.should.be.calledOnce();
		app.seed.length.should.be.equal(20);
	});

	it('should fire up init event ',(done)=>{
		app.seed=[];
		app.start();
		app.onInit = sinon.spy();
		app.on('init',()=>{
			app.onInit.should.be.calledOnce();
			done();
		});
	});

	it('should fire up init event ',(done)=>{
		app.seed=[];
		app.start();
		app.onInit = sinon.spy();
		app.on('init',()=>{
			app.onInit.should.be.calledOnce();
			done();
		});
	});
	
	it('should retry if task failed ',(done)=>{
		app.start();
		app.removeAllListeners('ready');
		let job = app._toJob({opt:'http://www.baidu.com/?q=1', next:'home'});
		job.status = Status.failed;
		job.fetchCount = 1;
		
		app.on('ready',() => {
			app.db.collection(app.name).insert(job, ()=>{
				app._dequeue((err, result) => {
					should.not.exists(err);
					result.value.opt.uri.should.eql('http://www.baidu.com/?q=1');
					done();
				});
			});
		});
	});

	it('should not dequeue if fetchCount is larger	than1 and status is failed ',(done)=>{
		app.start();
		app.removeAllListeners('ready');
		let job = app._toJob({opt:'http://www.baidu.com/?q=1', next:'home'});
		job.status = Status.failed;
		job.fetchCount = 2;
		
		app.on('ready',() => {
			app.db.collection(app.name).insert(job, ()=>{
				app._dequeue((err, result) => {
					should.not.exists(err);
					should.not.exist(result.value);
					done();
				});	
			});
		});
	});
	
});
