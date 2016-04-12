
'use strict';

const Core = require('./core')
const request = require('request')
const gearman = require("gearman-node-bda")
const functionsIn = require("lodash/functionsIn")

module.exports = class Worker extends Core{
    constructor(config){
	super();
	this.config = config;
    }
    
    /* 
     * Send request
     * 
     * @ctx context
     *
     * @api private
     */
    _send(ctx){
	let self = this;
	let req = request(ctx.opt, (err,res) => {
	    if(err) {
		console.error(err.stack);
		ctx.done();// tell scheduler to release a resource
		
		let opt = ctx.opt, r = opt.retries;
		opt.parse = ctx.parse;
		ctx = null;
		opt.priority = self.retryPriority;
		if(0 === r)
		    return self.emit('error.request',err);
		
		opt.retries = r ? r-1 : self.config.request.retry;
		process.nextTick(()=>self.enqueue(opt));
		return;
	    }
	    
	    ctx.response.res = res;
	    ctx.request.req = res.req; // attach node built-in request while got response
	    self.emit("responding",ctx);
	});
	
	ctx.request.req = req; // req is a wrapper of node built-in request
    }

    /*
     * Pase the response body, 
     * @ctx context
     * 
     * @api private
     *
     */
    _parse(ctx){
	let self = this;
	ctx.parse( ctx, () => self.emit("parsed",ctx) );
    }

    /* send back ctx.dataSet to client, serialize first
     * send new tasks
     *  private
     */
    
    _back(ctx){
	if(ctx.dataSet.size > 0){
	    this._job.sendWorkData( JSON.stringify([...ctx.dataSet]) );
	}
	
	this._job.workComplete( JSON.stringify(ctx.tasks) );
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
	return function(job){
	    self._job = job;
	    let opt = self._parseJobArgv();
	    opt.parse = self.app[fname]; //bind parser provided by spider, default for `parser`
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
	this._w.resetAbilities();
        this._w.close();
	process.exit(0);
    }
    
    /* Initilize Gearman Worker, 
     *  register functions, initialize scheduler and subscribe events of `Core`
     * 
     * @api private
     */
    _init(){
	this._w = gearman.worker(this.config.gearman)//register worker to master
	this.retryPriority = 10;
	this._hookSIG();
	this.initializeScheduler(this.config.schedule);
	
	functionsIn(this.app).forEach( fnKey => this._w.addFunction(this.app.name+"_"+fnKey, this._onJob(fnKey) ), this);//bind functions
        
	this.on("request", this._send.bind(this) )
	    .on("response", this._parse.bind(this) )
	    .on("process", this._back.bind(this) )
	    .on('error.middleware', this._onError.bind(this))
	    .on('error.request',this._onError.bind(this) );
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
	
	this._job.workComplete( JSON.stringify([]) );
    }
    
    /* Attach customer's app which should subscribe events: `request`, `response`, `process`
     *  
     * @api public
     */
    attach(app){
	this.app = app;
	return this;
    }
}
