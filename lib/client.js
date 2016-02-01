
'use strict';

const Core = require('./core')

//var seenreq = require("seenreq")
const winston = require("winston")
const MongoClient = require('mongodb').MongoClient
const gearman = require("gearman-node-bda")
const env = process.env.NODE_ENV || "development"
const debug = env === 'development';

let logClient = winston.loggers.get("Client")
let logWorker = winston.loggers.get("Worker")
let logServer = winston.loggers.get("JobServer")
let logJob = winston.loggers.get("Job")
let logLB = winston.loggers.get("LBStrategy")
let logProtocol = winston.loggers.get("protocol")
winston.cli();

if(env === 'production'){
    logClient.remove(logClient.transports.console)
    logWorker.remove(logWorker.transports.console)
    logServer.remove(logServer.transports.console)
    logJob.remove(logJob.transports.console)
    logLB.remove(logLB.transports.console)
    logProtocol.remove(logProtocol.transports.console)
    winston.remove(winston.transports.Console)
}else{
    logClient.transports.console.level = "info"
    logWorker.transports.console.level = "info"
    logServer.transports.console.level = "info"
    logJob.transports.console.level = "info"
    logLB.transports.console.level = "info"
    logProtocol.transports.console.level = "info"
}

logClient.add(winston.transports.File, { filename: './gearman.client.log',logstash:true,level:'info',handleExceptions: false });

const JOB_END = 'end'
, JOB_START = 'start'
, JOB_QUEUE = 'queue'
, CLIENT_READY = 'ready';

/* job => {opt:{},next:"functionName"} or just "http://www.baidu.com"
 * tasks => [job1,job2,job3,job4]
 * 
 *
 *
 *
 *
 */

module.exports =  class Client extends Core{
    constructor(config){
	super();
	this.serverTasks=[];
	this.dbTasks=[];
	this.db = null;
	this.maxQueueSize = 100;
	this.gearmanClient = gearman.client(config.gearman);
	this.config = config;
    }
    
    _init(){
	let self = this;
	if(debug)
	    logClient.info(this.app.name);
	
	// this.seenOptions = this.seenOptions || {};
	// this.seenOptions.appName = this.app.name;
	//this.seen = new seenreq(this.seenOptions);
	
	this.gearmanClient.on("error", err => logClient.error(err) )
	this.gearmanClient.on("jobServerError", (jobServerUid,code,msg) => logClient.error(msg) )
	this.gearmanClient.on("socketError", (jobServerUid,e) => e && logClient.error(e) )
	this.gearmanClient.on("socketDisconnect", (jobServerUid,e) => e && logClient.error(e) )
	
	MongoClient.connect( this.config.mongodb ,function(err,db){
	    if(err) throw err;
	    logClient.info("Connect to mongodb success.");
	    db.collection(self.app.name).createIndex({_id:1});
	    db.collection(self.app.name).createIndex({app:1,_id:1});
	    self.db = db;
	    self.emit(CLIENT_READY);
	});
	
	this.on(JOB_START,function(job){
	    this.serverTasks.push(0);
	});
	
	this.on(JOB_END,function(){
	    this.serverTasks.pop();
	    this._dequeue(this._dehandler);
	    if(debug)
		logClient.info("there are %d jobs",this.serverTasks.length);
	});
	
	this.on(CLIENT_READY,function(){
	    let startup = function(){
		/* TODO: deal with recover */
		// if(args[0] == 'db'){
		//     logClient.info("Start fetching job from database.");
		//     this._dequeue(this._dehandler);
		// }else{
		//     logClient.info("Start fetching job from seed.");
		this._go({opt:this.seed});
		// }
	    }.bind(this);
	    
	    if(this.app.onInit){
		this.app.onInit(startup);
	    }else{
		startup();
	    }
	});
	
	this.on(JOB_QUEUE,function(items){
	    if(items.length===0)
		return;
	    
	    if(debug){
		logClient.info(items);
	    }
	    
	    for (let i = 0; i < items.length/1000; i++) {
    		let count = items.length-1000*i;
    		count = count>1000?1000:count;
    		this.dbTasks.push(2);
    		this.db.collection(this.app.name).insertMany(items.slice(i*1000, i*1000+count),function(err,result){
		    if(err) logClient.error(err);
		    self.dbTasks.pop();
		});
	    };
	});
    }

    _enqueue(jobs){
	if(jobs.length == 0)
	    return;
	
	let items = [];
	for(let i=0;i<jobs.length;i++){
	    items.push({
		payload:JSON.stringify(jobs[i]),
		app:this.app.name
	    });
	}
	
	this.emit(JOB_QUEUE,items);
    }
    
    _dequeue(fn){
	this.db.collection(this.app.name).findAndModify({app:this.app.name},[['_id',1]],{remove:true},fn.bind(this));
    }

    _dehandler(err,result){
	if(err){
	    logClient.error(err);
	}else{
	    if(result.value && result.value.payload) {
		this._go(JSON.parse(result.value.payload));
		if(this.serverTasks.length<this.maxQueueSize){
		    process.nextTick(function(){this._dequeue(this._dehandler)}.bind(this));
		}
	    }else if(this.serverTasks.length===0){
		//need finalize resources.
		if(this.dbTasks.length===0){
		    this.db.close();
		    this.gearmanClient.close();
		    //this.seen.dispose();
		    if(this.onEnd){
			this.onEnd();
		    }
		    
		    logClient.profile(this.app.name);
		    logClient.info("=====All done=====");
		}else{
		    setTimeout(function(){this._dequeue(this._dehandler)}.bind(this),2000);
		}
	    }
	}
    }

    _go(job){
	let fn = job.fn || job.next || "parse"
	, argv = job.opt || job;
	
	if(argv instanceof Array){
	    let opt;
	    while(opt = argv.shift()){
		this._go({next:fn,opt:opt});
	    }
	    return;
	}else if(typeof argv ==='string'){
	    this._go({next:fn,opt:{uri:argv}});
	    return;
	}
	
	let objJob = this.gearmanClient.submitJob(this.app.name+"_"+fn, JSON.stringify(argv),{background: false});
	this.emit(JOB_START,objJob);
	
	if(debug){
	    logClient.debug("fn: %s, argv: %s",this.app.name+"_"+fn,JSON.stringify(argv));
	}
	
	let self = this;
	objJob.on('workData', function(data) {//all data end with \n?
	    if(self.app.onData){
		self.app.onData(data,function(){});
	    }
	    if(debug)
     		logClient.debug('WORK_DATA >>> ' + data);
	});
	
	objJob.on("warning",function(data){
	    logClient.warn(data);
	});
	
	objJob.on("failed",function(){
	    logClient.warn("work failed")
	    this.emit(JOB_END);
	});
	
	objJob.on("exception",function(emsg){
	    logClient.error('job exception: %s',emsg);
	    this.emit(JOB_END);
	});
	
	objJob.on("error",function(e){
	    logClient.error('job error: %s',e);
	    this.emit(JOB_END);
	});
	
	objJob.on('timeout',function(){
	    logClient.warn("time out");
	    this.emit(JOB_END);
	});
	
	objJob.on('complete', function() {
	    let res=null;
	    try{
		res = JSON.parse(objJob.response.toString());
	    }catch(e){
		logClient.error(e);
		return;
	    }
	    
	    if(self.app.onComplete){
		self.app.onComplete(res);
	    }
	    
	    self._enqueue(res);
	    process.nextTick(function(){self.emit(JOB_END);});
	});
    }

    start(){
	this._init();
	this.seed = this.app.seed || this.app.initRequests();
    }

    attach(app){
	this.app = app;
	return this;
    }
}

/*
 * app must supply `name`, `seed` is optional
 * @name:       [String] set app name which also used as function prefix
 * @seed:       [Array|String|Object] start url(s) or options
 * @onData:     [Function] called while client receiving data
 * @onComplete: [Function] called while a job complete
 */
