
'use strict';

const winston = require('winston')
const Core = require('floodesh-lib')
const gearman = require("gearman-node-bda")
const config = require('../config.js')
const path = require('path')
const fs = require('fs')
const env = process.env.NODE_ENV || "development"

module.exports = class Worker extends Core {
    constructor(){
	super();
	let pkg = require(path.join(process.cwd(),'package'));
	let parserDir = path.join(process.cwd(),'lib','parser');

	this.parsers = Object.create(null);
	fs.readdirSync(parserDir)
	    .filter(name=>name.match(/\.js$/))
	    .forEach(name=> this.parsers[name.replace(/\.js$/,'')]=require(path.join(parserDir,name)),this);
	
	this.config = config
	delete this.config.gearman.loadBalancing;
	this.name = pkg.name;
	this.version = pkg.version;
	this.logger = winston.loggers.get("floodesh");
	
	this._init();
    }
    
    /*
     * Pase the response body, 
     * @ctx context
     * 
     * @api private
     *
     */
    parse(){
	return (ctx, next)=>{
	    ctx.app.logger.debug("Start parsing: %s",ctx.func);
	    return ctx.app.parsers[ctx.func](ctx, next);
	};
	
	//ctx.performance.responsemwTimestamp = Date.now();
	//ctx.parse.call( this.app,ctx, () => self.emit("parsed",ctx) );
    }

    /* send back ctx.dataSet to client, serialize first
     * send new tasks
     *  private
     */
    
    _back(ctx){
	this.logger.debug("Work complete: %s", ctx.url);
	if(ctx.dataSet.size > 0){
	    (!this._w.closed) && ctx.job.sendWorkData( JSON.stringify([...ctx.dataSet]) );
	}
	
	(!this._w.closed) && ctx.job.workComplete( JSON.stringify(ctx.tasks) );
    }

    /* Job parser from `String` to `Object` (also deserialize)
     *
     *  @api private
     */
    _parseJobArgv(job){
	return JSON.parse(job.payload.toString());
    }

    /* Common processing function for Gearman Worker,
     *  return function specified by name.
     *
     *  @api private
     */
    _onJob(fname){
	let self = this;
	
	return function(job){
	    let opt = self._parseJobArgv(job);

	    self.logger.debug("New Job",opt);
	    
	    let ctx = self.enqueue(opt);
	    ctx.func = fname;
	    ctx.job = job;
	}
    }

    _retry(ctx){
	let opt=ctx.opt,r = opt.retries;
	opt.priority = this.retryPriority;
	opt.retries = r ? r-1 : this.config.retry;
	
	this.logger.debug("Retries: %d, %s", opt.retries, opt.uri);
	
	let newCtx = this.enqueue(opt);
	newCtx.func = ctx.func;
	newCtx.job = ctx.job;
	ctx=null;
    }
    
    /* Hook process signal (current is INT)
     * which is sent by `Ctrl+c`
     * or `kill -SIGINT <pid>`
     * 
     */
    _hookSIG(){
	process.on('SIGINT',this._exit.bind(this));
    }

    /* Exit gracefully
     * notify server that worker no longer receive job
     * and close connection
     *
     */
    _exit(){
	let self = this;
	(!this._w.closed) && this._w.resetAbilities( (e) =>{
	    if(e) self.logger.error(e.stack);
	    self._w.close();
	});
    }

    _register2Server(){
	return gearman.worker(this.config.gearman);
    }

    _registerFunctions(names){
	if(!(names instanceof Array)){
	    names = [names];
	}
	
	for(let i=0;i<names.length;i++){
	    this._w.addFunction(this.name+'_'+names[i], this._onJob(names[i]));
	}
    }
    
    /* Initilize Gearman Worker, 
     *  register functions, initialize scheduler and subscribe events of `Core`
     * 
     * @api private
     */
    _init(){
	this._w = this._register2Server()//gearman.worker(this.config.gearman)//register worker to master
	this.retryPriority = 10;
	this._hookSIG();

	//this.initializeScheduler(this.config.schedule);

	
	this._registerFunctions(Object.keys(this.parsers));
        
	this.on("complete", this._onComplete.bind(this) )
	    .on('error', this._onError.bind(this))
//	    .on("request", this._send.bind(this) )
//	    .on("response", this._parse.bind(this) )
//	    .on('error.request',this._onError.bind(this) );

	// let self = this;
	// this._w.on("socketError",(id, e)=>{console.error("%s, %s",id, e.stack)});
	// this._w.on("jobServerError",(id, code, msg)=>{
	//     self._onError(new Error(msg));
	// });
    }

    _onComplete(ctx){
	//ctx.releaseBtlneck();
	this._back(ctx);
    }

    /* default erorr handler for `Worker`
     *  should send message to server to end current job.
     * 
     */
    _onError(e, ctx){
	if(e instanceof Error){
	    this.logger.error(e.stack);
	}else{
	    this.logger.error(e);
	}

	// to release resources that is occupied, for bottleneck, database, tcp connection etc.
	Object.keys(ctx.resourceList).forEach(resource=>ctx.resourceList[resource]());
	
	switch(e.code){
	case "ETIMEDOUT":
	case "ENETRESET":
	case "ECONNRESET":
	case "ECONNABORTED":
	    if(0 === ctx.opt.retries){
		break;
	    }else{
		return this._retry(ctx);
	    }
	default:
	    break;
	}
	
	(!this._w.closed) && ctx.job.reportException( JSON.stringify(e) );
    }
 }
