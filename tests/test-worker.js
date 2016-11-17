
"use strict"

const should = require('should')
const sinon = require('sinon')
require('should-sinon')
const Worker = require('../worker')
const Core = require('floodesh-lib')
const events = require('events')

describe('Worker',function(){
    let w;
    beforeEach( () => {
	w = new Worker();
    });
    
    describe('#constructor', () => {
	it('should return default instance of Worker and Core', () => {
	    w.should.be.an.instanceOf(Worker);
	    w.should.be.an.instanceOf(Core);
	});
	
	it('should call _init in constructor()', () =>{
	    should.exist(w._w);
	});
    });
    
    describe('#_init', () =>{
	beforeEach( () => {
	    Worker.prototype._hookSIG= sinon.spy();
	    w = new Worker();
	});
	
	it('should listen on customized functions', () =>{
	    should.exists(w._w.functions.testapp_home);
	});
	
	it('should call _hookSIG() once', ()=>{
	    w._hookSIG.should.be.calledOnce();
	});

	it("should subscribe events of `Core`",()=>{
	    events.EventEmitter.listenerCount(w,"complete").should.equal(1);
	    events.EventEmitter.listenerCount(w,"error").should.equal(1);
	    events.EventEmitter.listenerCount(w,"exit").should.equal(1);
	});
    });

    describe('#_onJob', () => {
	it('should return a function',()=>{
	    let func = w._onJob("abc");
	    func.should.be.an.instanceof(Function);
	})
    });

    describe('#_back',()=>{
	let ctx = {job:{}};
	beforeEach(()=>{
	    ctx.job.sendWorkData = sinon.spy();
	    ctx.job.workComplete = sinon.spy();
	    ctx.dataSet = new Map();
	    ctx.tasks = [{opt:{uri:"http://www.baidu.com/"},fn:"ffn"}];
	});
	
	it("shouldn't call sendWorkData if ctx has empty dataSet",()=>{
	    w._back(ctx);
	    ctx.job.sendWorkData.should.have.callCount(0);
	});
	
	it('should call sendWorkData if ctx has dataSet', ()=>{
	    ctx.dataSet.set('data',"ABCDEFGHIJKLMNOPQRSTUVWXYZ");
	    w._back(ctx);
	    ctx.job.sendWorkData.should.be.calledOnce();
	    let argv = ctx.job.sendWorkData.getCall(0).args[0];
	    JSON.parse(argv)[0][0].should.equal('data');
	});

	it('should call workComplete',()=>{
	    w._back(ctx);
	    ctx.job.workComplete.should.be.calledOnce();
	});
    });

    describe('#_parseJobArgv',()=>{
	let ctx = {job:{}};
	it('should parse payload in job',()=>{
	    let payload = {uri:"http://www.baidu",method:"GET"};
	    let buf = new Buffer(JSON.stringify(payload));
	    ctx.job = {payload:buf};
	    let rt = w._parseJobArgv(ctx.job);
	    
	    should.exists(rt);
	    rt.method.should.equal(payload.method);
	    rt.uri.should.equal(payload.uri);
	});
    });
    
    describe('#_onError',()=>{
	let ctx = {resourceList:{}};
	it('should send error to server',()=>{
	    ctx.job = {};
	    ctx.job.reportError = sinon.spy();
	    w._finally = sinon.spy();
	    let e = new Error("this is an error for testing");
	    w._onError(e,ctx);
	    ctx.job.reportError.should.be.calledOnce();
	    w._finally.should.be.calledOnce();
	})
    });

    describe('#_hookSIG', ()=>{
	let ctx = {};
	beforeEach(()=>{
	    ctx.job = {resetAbilities:function(){},close:function(){}};
	});
	
	it('should listen on process SIGINT signal',()=>{
	    events.EventEmitter.listenerCount(process,'SIGINT').should.equal(8);
	});
	
	it('should set readyToExit to true when receive INT signal',()=>{
	    w.exit();
	    w.readyToExit.should.be.true();
	});
    });
});
