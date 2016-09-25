
'use strict';

const Core = require('floodesh-lib')
const gearman = require("gearman-node-bda")
const functionsIn = require("lodash/functionsIn")
const debug = require("debug")("floodesh-worker")
const path = require('path')



module.exports = class Worker extends Core {
    constructor(options){
	super();
	this.config = require(path.join(process.cwd(),'config'))
	delete this.config.gearman.loadBalancing;
	
	this._init();
	this._registerParser(options.functions);
    }
    
    /*
     * Pase the response body, 
     * @ctx context
     * 
     * @api private
     *
     */
    _parse(ctx){
	debug("parsing");
	let self = this;
	//ctx.performance.responsemwTimestamp = Date.now();
	//ctx.parse.call( this.app,ctx, () => self.emit("parsed",ctx) );
    }

    /* send back ctx.dataSet to client, serialize first
     * send new tasks
     *  private
     */
    
    _back(ctx){
	debug("work complete to server");
	if(ctx.dataSet.size > 0){
	    (!this._w.closed) && this._job.sendWorkData( JSON.stringify([...ctx.dataSet]) );
	}
	
	(!this._w.closed) && this._job.workComplete( JSON.stringify(ctx.tasks) );
    }

    /* Entry of worker.
     *
     *  @api public
     **/
    start(){
	this._init();
    }

    /* Job parser from `String` to `Object` (also deserialize)
     *
     *  @api private
     */
    _parseJobArgv(){
	return JSON.parse(this._job.payload.toString());
    }

    /* Common processing function for Gearman Worker,
     *  return function specified by name.
     *
     *  @api private
     */
    _onJob(fname){
	let self = this;
	this.use((ctx, next) => {
	    ctx.parser = fname;
	    console.log("middleware: %s", fname);
	    return next();
	});
	
	return function(job){
	    self._job = job;
	    let opt = self._parseJobArgv();
	    //opt.parse = self.app[fname]; //bind parser provided by spider, default for `parser`
	    
	    
	    self.enqueue(opt);// notify core to schedule the `options`
	}
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
	    if(e) console.error(e.stack);
	    self._w.close();
	});
    }

    _register2Server(){
	return {
	    addFunction:(name,fn)=>{
		console.log("add function: %s",name);
	    }
	}
	//return gearman.worker(this.config.gearman);
    }

    _registerParser(names){
	if(!(names instanceof Array)){
	    names = [names];
	}
	
	for(let i=0;i<names.length;i++){
	    this._w.addFunction('app name_'+names[i], this._onJob(names[i]));
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
	
	//functionsIn(this.app).forEach( fnKey => this._w.addFunction(this.app.name+"_"+fnKey, this._onJob(fnKey) ), this);//bind functions
        
	this.on("complete", this._back.bind(this) )
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
    
    /* default erorr handler for `Worker`
     *  should send message to server to end current job.
     * 
     */
    _onError(e){
	if(e instanceof Error){
	    console.error(e.stack);
	}else{
	    console.error(e);
	}
	
	(!this._w.closed) && this._job.workComplete( JSON.stringify([]) );
    }

    get job(){
	return this._job;
    }
    
    /* Attach customer's app which should subscribe events: `request`, `response`, `process`
     *  
     * @api public
     */
    attach(app){
	this.app = app;
	return this;
    }

    /*
     * 
     */
    get name(){
	return this.app.name;
    }
}
