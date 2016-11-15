
'use strict';

const Core = require('floodesh-lib')
const fs = require('fs')
const seenreq = require("seenreq")
const winston = require("winston")
const MongoClient = require('mongodb').MongoClient
const gearman = require("gearman-node-bda")
const config = require('../lib/config.js')
const Status = require('../lib/status.js')
const Job = require('../lib/job.js')
const path = require('path')

let logClient = winston.loggers.get("Client")

const JOB_END = 'end'
, JOB_START = 'start'
, JOB_QUEUE = 'queue'
, CLIENT_READY = 'ready'
, DEFAULT_FN = 'parse'
, DEFAULT_PRIORITY = 1;

let args = process.argv.slice(2);

/* job => {opt:{},next:"functionName"} or just "http://www.baidu.com"
 * tasks => [job1,job2,job3,job4]
 * 
 *
 *
 *
 *
 */

module.exports =  class Client extends Core{
    constructor(){
	super();
	this.serverTasks=[];
	this.dbTasks=[];
	this.db = null;
	this.srvQueueSize = config.gearman.srvQueueSize||100;
	this.gearmanClient = gearman.client(config.gearman.client);
	this.config = config;
    }
    
    _init(){
	let self = this;
	logClient.info(this.app.name);
	
	let seenOptions = this.config.seenreq;
	if(seenOptions){
	    seenOptions.appName=this.app.name;
	    this.seen = new seenreq(seenOptions);
	}
	
	this.gearmanClient.on("error", err => logClient.error(err.stack) )
	this.gearmanClient.on("jobServerError", (jobServerUid,code,msg) => logClient.error(msg) )
	this.gearmanClient.on("socketError", (jobServerUid,e) => e && logClient.error(e.stack) )
	this.gearmanClient.on("socketDisconnect", (jobServerUid,e) => e && logClient.error(e.stack) )
	
	MongoClient.connect( this.config.mongodb ,function(err,db){
	    if(err) throw err;
	    logClient.info("Connect to mongodb success.");
	    db.collection(self.app.name).createIndex({status:1, priority:1,_id:1});
	    self.db = db;
	    self.emit(CLIENT_READY);
	});
	
	this.on(JOB_START,function(job){
	    logClient.debug(job.toString());
	    this.serverTasks.push(0);
	});
	
	this.on(JOB_END,function(gearmanJob,status){
	    this.serverTasks.pop();
	    
	    //update mongodb
	    if(status === Status.success || status === Status.failed ){
		this.db.collection(this.app.name)
		    .update({
			_id:gearmanJob.jobVO._id
		    },{
			$set:{status:status}
		    });
	    }else{
		logClient.error("Status error: %d", status);
	    }
	    
	    if(this.serverTasks.length<this.srvQueueSize)
		this._dequeue(this._dehandler);

	    logClient.debug("Server queued jobs: %d",this.serverTasks.length);
	});
	
	this.on(CLIENT_READY,function(){
	    let startup = function(){
		/* TODO: deal with recover */
		if(args[0] === 'db'){
		    logClient.info("Start fetching job from database.");
		    this._dequeue(this._dehandler);
		}else{
		    logClient.info("Start fetching job from seed.");
		    this._go(this.seed);
		}
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

	    let bulk = this.db.collection(this.app.name).initializeUnorderedBulkOp();
	    
	    for(let i =0;i<items.length;i++){
		bulk.insert(items[i]);
	    }
	    
	    this.dbTasks.push(2);
	    bulk.execute(err => {
		if(err) logClient.error(err);
		self.dbTasks.pop();
	    });
	});
    }

    _toJob(task){
	let opt = typeof task.opt === "string" ? {uri:task.opt} : task.opt
	, priority = task.hasOwnProperty('priority')? task.priority : (opt.hasOwnProperty('priority')?opt.priority:DEFAULT_PRIORITY);

	if(priority !== DEFAULT_PRIORITY){
	    opt.priority = priority;
	}
	
	return Job({
	    opt: opt,
	    app:this.app.name,
	    priority : priority,
	    next : task.next || DEFAULT_FN,
	    status : Status.waiting
	});
    }
    
    _getPriority(num){
        switch(num){
        case 2:
	    return "LOW";
	case 0:
	    return "HIGH";
	case 1:
	    return "NORMAL";
        default:
	    return "NORMAL";
        }
    }

    _enqueue(jobs){
	if(jobs.length === 0)
	    return;
	
	let items = [], requests=[], self=this;
	for(let i=0;i<jobs.length;i++){
	    requests.push(jobs[i].opt);
	    items.push(this._toJob(jobs[i]));
	}
	
	if(!this.seen)
	    return this.emit(JOB_QUEUE,items);
	
	items=[];//empty final job list.
	this.dbTasks.push(3);
	this.seen.exists(requests,function(err,result){
	    self.dbTasks.pop();
	    if(err){
		logClient.error(err);
	    }else{
		logClient.verbose(result);
		
		result.forEach(function(r,idx){
		    if(r){
			return;
		    }else{
			items.push(self._toJob(jobs[idx]));
		    }
		});
		self.emit(JOB_QUEUE,items);
	    }
	});
    }
    
    _dequeue(fn){
	//findAndModify() will only select one document to modify.
	this.db.collection(this.app.name)
	    .findAndModify({// query
		$or:[{
		    status:Status.waiting
		},{
		    status:Status.failed
		}]
	    },{// sort
		priority:1,
		_id:1
	    },{// update operations
		$set:{status:Status.going},
		$currentDate:{
		    updatedAt:{$type:"date"},
		    fetchTime:{$type:"date"}
		}
	    },fn.bind(this));
    }

    _dehandler(err,result){
	if(err){
	    logClient.error(err);
	}else{
	    if(result.value && result.value.opt) {
		logClient.debug("Job: %s",JSON.stringify(result.value));
		
		this._goOne(result.value);
		if(this.serverTasks.length<this.srvQueueSize){
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

    /*
     *
     * To create job
     job: {
     opt:{uri:"https://www.baidu.com"},
     next:"parse",
     priority:1,
     status:1
     }

    */
    _go(job){
	job = job instanceof Array ? job : [job];
	for(let i = 0; i < job.length; ++i) {
	    let task = job[i];
	    if(typeof job === 'string') {
		task = {opt:{uri:task},next:DEFAULT_FN};
	    } else {
		if(!task.next) {
		    task = {opt:task,next:DEFAULT_FN};
		}
		
		if(typeof task.opt === 'string') {
		    task.opt = {uri:task.opt};
		}
	    }
	    
	    this._goOne(task);
	}
    }

    _goOne(job){
	let argv = job.opt
	, fn = job.next
	, priority = this._getPriority(job.hasOwnProperty("priority")?job.priority:DEFAULT_PRIORITY);
	
	let objJob = this.gearmanClient.submitJob(this.app.name+"_"+fn, JSON.stringify(argv),{background: false, priority:priority});
	objJob.jobVO = job;
	this.emit(JOB_START,objJob);
	
	logClient.debug("fn: %s, argv: %s",this.app.name+"_"+fn,JSON.stringify(argv));
	logClient.debug(objJob.getUid());
	
	let self = this;
	objJob.on('workData', function(data) {//all data end with \n?
	    let ds = new Map(JSON.parse(data.toString()));
	    if(self.app.onData){
		self.app.onData(ds, function(){});
	    }

     	    logClient.verbose('WORK_DATA >>> ' + ds);
	});
	
	objJob.on("warning",function(data){
	    logClient.warn(data);
	});
	
	objJob.on("failed",function(){
	    logClient.warn("work failed")
	    self.emit(JOB_END, objJob,Status.failed);
	});
	
	objJob.on("exception",function(emsg){
	    logClient.error('job exception: %s',emsg);
	    self.emit(JOB_END,objJob,Status.failed);
	});
	
	objJob.on("error",function(e){
	    logClient.error('job error: %s',e);
	    self.emit(JOB_END,objJob,Status.failed);
	});
	
	objJob.on('timeout',function(){
	    logClient.error("time out");
	    self.emit(JOB_END,objJob,Status.failed);
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
	    // res must be a job format, cannot handle 
	    self._enqueue(res);
	    process.nextTick(function(){self.emit(JOB_END,objJob,Status.success);});
	});
    }

    start(){
	this._init();
	this.seed = this.app.seed || (fs.existsSync(path.join(process.cwd(),'seed.json')) && require(path.join(process.cwd(),'seed.json'))) ||this.app.initRequests()|| this.config.seed;
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
