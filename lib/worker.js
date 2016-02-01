
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
	    if(err) throw err; // TODO: not very clear how to handle error. maybe emit on `ctx`
	    
	    ctx.response.res = res;
	    self.emit("responding",ctx);
	});
	
	ctx.request.req = req;
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
	this._job.sendWorkData( JSON.stringify([...ctx.dataSet]) );
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
    
    /* Initilize Gearman Worker, 
     *  register functions, initialize scheduler and subscribe events of `Core`
     * 
     * @api private
     */
    _init(){
	let w = gearman.worker(this.config.gearman);//register worker to master
	let appname = this.app.name;
	let self = this;
	
	functionsIn(this.app).forEach( fnKey => w.addFunction(appname+"_"+fnKey, self._onJob(fnKey) ) );//bind functions
	
	this.initializeScheduler(this.config.schedule);
	this.on("request", this._send.bind(this) );
	this.on("response", this._parse.bind(this) );
	this.on("process", this._back.bind(this) );
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
