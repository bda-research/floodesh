
"use strict"

const should = require('should')
const sinon = require('sinon')
require('should-sinon')
const Worker = require('..').Worker
const Client = require('..').Client
const Core = require('../lib/core')
const events = require('events')
const http = require('http')
const request = require('request')

describe('Worker',function(){
    let config = {
	gearman:{
	    "servers":[{"host":"127.0.0.1"}]
	},
	mongodb:"mongodb://127.0.0.1:27017/test",
	schedule:{
	    concurrent: 10,
	    rate: 500 // ms between every request
	},
	request:{
	    retry:3
	}
    };
    
    let w, c, testWorker,testClient;
    beforeEach( () => {
	testWorker = function() { this.name = "test-worker"};
	testClient = () => {this.name = 'test-client', this.seed=['http://www.baidu.com/']};

	w = new Worker(config);
	//c = new Client(config);
    });
    
    describe('#constructor', () => {
	it('should return default instance of Worker and Core', () => {
	    
	    w.should.be.an.instanceOf(Worker);
	    w.should.be.an.instanceOf(Core);
	    //instanceWorker.parse = sinon.spy();
	    
	    //w.attach(instanceWorker).start();
	    //c.attach(new testClient()).start();
	});
	
	
    });
    
    describe('#attach',()=>{
	it('should set app property when calling attach ',()=>{
	    w.attach({}).should.be.an.instanceof(Worker)
	    w.should.have.property('app');
	});
    });

    describe('#start',() => {
	it('should call _init in start()', () =>{
	    w._init = sinon.spy();
	    w.start();
	    w._init.should.be.calledOnce();
	});
    });
    
    describe('#_init', () =>{
	let instanceWorker;
	beforeEach( () => {
	    testWorker.prototype.tFunc = (ctx,done) => {};
	    instanceWorker = new testWorker();
	    
	    w.initializeScheduler = sinon.spy();
	    w._hookSIG = sinon.spy();
	    w.attach(instanceWorker);
	    w._init();
	});
	
	it('should listen on customized functions', () =>{
	    should.exists(w._w.functions[instanceWorker.name+"_tFunc"]);
	});
	
	it('should call initializeScheduler() once', ()=>{
	    w.initializeScheduler.should.be.calledOnce();
	});

	it('should call _hookSIG() once', ()=>{
	    w._hookSIG.should.be.calledOnce();
	});

	it("should subscribe events of `Core`",()=>{
	    events.EventEmitter.listenerCount(w,"request").should.equal(1);
	    events.EventEmitter.listenerCount(w,"response").should.equal(1);
	    events.EventEmitter.listenerCount(w,"process").should.equal(1);
	    events.EventEmitter.listenerCount(w,"error.middleware").should.equal(1);
	    events.EventEmitter.listenerCount(w,"error.request").should.equal(1);
	});
    });

    describe('#_onJob', () => {
	it('should return a function',()=>{
	    let func = w._onJob("abc");
	    func.should.be.an.instanceof(Function);
	})
    });

    describe('#_parse', ()=>{
	let ctx;
	beforeEach(()=>{
	    ctx  = {
		parse:(ctx,done)=>{
		    done();
		},
		performance:{}
	    };
	    w.emit = sinon.spy();
	});
	
	it('should call ctx.parse once',() => {
	    ctx.parse = sinon.spy();
	    w._parse(ctx);
	    ctx.parse.should.be.calledOnce();
	});

	it('should emit `parsed` event when done',()=>{
	    w._parse(ctx);
	    w.emit.should.be.calledOnce();
	    w.emit.getCall(0).args[0].should.equal('parsed');
	    w.emit.getCall(0).args[1].should.equal(ctx);
	});
    });

    describe('#_back',()=>{
	let ctx = {};
	beforeEach(()=>{
	    w._job = {};
	    w._job.sendWorkData = sinon.spy();
	    w._job.workComplete = sinon.spy();
	    ctx.dataSet = new Map();
	    ctx.tasks = [{opt:{uri:"http://www.baidu.com/"},fn:"ffn"}];
	});
	
	it("shouldn't call sendWorkData if ctx has empty dataSet",()=>{
	    w._back(ctx);
	    w._job.sendWorkData.should.have.callCount(0);
	});
	
	it('should call sendWorkData if ctx has dataSet', ()=>{
	    ctx.dataSet.set('data',"ABCDEFGHIJKLMNOPQRSTUVWXYZ");
	    w._back(ctx);
	    w._job.sendWorkData.should.be.calledOnce();
	    let argv = w._job.sendWorkData.getCall(0).args[0];
	    JSON.parse(argv)[0][0].should.equal('data');
	});

	it('should call workComplete',()=>{
	    w._back(ctx);
	    w._job.workComplete.should.be.calledOnce();
	});
    });

    describe('#_send',()=>{
	let ctx;
	beforeEach(()=>{
	    ctx = {request:{},response:{}, performance:{}};
	    ctx.opt={uri:"https://www.baidu.com/"};
	    ctx.done=()=>{};
	    w.removeAllListeners('responding');
	});
	
	it('should exists `req`, and it should be request.`Request`',(done)=>{
	    w.on('responding', ctx => done());
	    w._send(ctx);
	    should.exists(ctx.request.req);
	    ctx.request.req.should.be.an.instanceof(request.Request);
	});
	
	it('should attach `res` to ctx if success',(done)=>{
	    w.on('responding', ctx => {
		should.exists(ctx.request.req);
		should.exists(ctx.response.res);
		ctx.request.req.should.be.an.instanceof(request.Request);
		ctx.response.res.should.be.an.instanceof(http.IncomingMessage);
		done();
	    });
	    
	    w._send(ctx);
	});
    });

    describe('#_parseJobArgv',()=>{
	it('should parse payload in job',()=>{
	    let payload = {uri:"http://www.baidu",method:"GET"};
	    let buf = new Buffer(JSON.stringify(payload));
	    w._job = {payload:buf};
	    let rt = w._parseJobArgv();
	    
	    should.exists(rt);
	    rt.method.should.equal(payload.method);
	    rt.uri.should.equal(payload.uri);
	});
    });
    
    describe('#_onError',()=>{
	it('should send message to server',()=>{
	    w._job = {};
	    w._job.workComplete = sinon.spy();
	    let e = new Error("this is an error for testing");
	    w._onError(e);
	    w._job.workComplete.should.be.calledOnce();
	})
    });

    describe('#_hookSIG', ()=>{
	beforeEach(()=>{
	    w._exit = sinon.spy();
	    w._w = {resetAbilities:function(){},close:function(){}};
	    w._hookSIG();
	});
	
	it('should listen on process SIGINT signal',()=>{
	    events.EventEmitter.listenerCount(process,'SIGINT').should.equal(2);
	});
	
	it('should call `_exit` when receive INT signal',()=>{
	    process.emit("SIGINT");
	    w._exit.should.be.calledOnce();
	});
    });
});
