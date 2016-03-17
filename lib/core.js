
'use strict';

const Mof = require('mof')
const Emitter = require('events')
const Bottleneck = require('bottleneckp')
const Context = require('./context.js')
const request = require('./request.js')
const response = require('./response.js')
const assign = require("lodash/assign")

/*
 * depart into 3 stags, onrequest, onresponse, onparsed
 * get task
 * normalize task(could use a middleware)
 * send to other middleware
 *
 * events raised by `Core`: `resquest`, `response`,`process`
 * events subscribed by `Core`: `responding`, `parsed`
 * 
 *
 */

module.exports = class Core extends Emitter{
    constructor() {
	super();
	let self = this;

	/* initialize middleware */
	["_request","_response","_parsed"].forEach( (k) => this[k]=new Mof(),this);
	
	/* subscribe event */
	this.on("responding", ctx => {
	    ctx.done();// tell bottleneck that current resource could be released.
	    
	    if( ctx.next().value === ctx.RES ){
		self.responsemw.callback( ctx => self.emit("response",ctx), err => {self.emit('error.middleware',err); })(ctx);
	    }else{
		throw new Error("context status error!");
	    }
	});
	
	this.on("parsed", ctx => {
	    if( ctx.next().value === ctx.PARSED) {
		self.parsedmw.callback( ctx => self.emit("process",ctx), err => {self.emit('error.middleware',err); } )(ctx);
	    }else{
		throw new Error("context status error!");
	    }
	});
    }
    
    /* initialize scheduler
     * 
     * @api protected
     *
     */
    initializeScheduler(options){
	this._scheduler = new Bottleneck.Cluster(options.concurrent, options.rate);
    }
    
    get requestmw(){
	return this._request;
    }

    get responsemw(){
	return this._response;
    }

    get parsedmw(){
	return this._parsed;
    }
    
    /**
     * normalize a request options. (keep it simple)
     *
     * @reqopt String or Object of options
     * @api private
     *
     */
    
    _normalize(reqopt){
	let opt = {
	    gzip:true,
	    encoding:null
	};
	
    	if(typeof reqopt === 'string') return (opt.uri=reqopt && opt);
	if(typeof reqopt === 'object') return assign(opt,reqopt);
	
	throw new TypeError("request options must be a string or an object.");
    }

    /**
     * enqueue jobs.
     *
     * @opt `options` of request
     * @theTime callback of bottleneck when it's time
     * 
     * @api protected
     */
    
    enqueue(opt){
	let self = this;
	this._scheduler.key(opt.limiter||"default").submit( opt.priority||1 ,done => {
	    let ctx = self._createContext(opt);
	    ctx.done = done;
	    if(ctx.next().value === ctx.REQ){
		self.requestmw.callback( ctx => self.emit("request",ctx) , err => {self.emit('error.middleware',err,ctx); })(ctx);
	    }else{
		throw new Error("context status error!");
	    }
	});
    }
    
    /**
     * Initialize a new context.
     *
     * @api private
     */

    _createContext(task){
	const ctx = Context();
	const rq = ctx.request = Object.create(request);
	const rs = ctx.response = Object.create(response);
	ctx.opt = this._normalize(task);
	ctx.parse = ctx.opt.parse;
	ctx.request.req = ctx.response.res = null;
	rq.ctx = rs.ctx = ctx;
	ctx.app = rq.app = rs.app = this;
	ctx.meta = new Map();
	ctx.dataSet = new Map();
	ctx.tasks = [];
	return ctx;
    }
}
