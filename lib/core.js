
'use strict';

const Mof = require('mof')
const Emitter = require('events')
const Bottleneck = require('bottleneckp')
const Context = require('./context.js')
const request = require('./request.js')
const response = require('./response.js')
const reqopt = require('./requestoptions.js')
const assign = require('lodash/object/assign')

/*
 * depart into 3 stags, onrequest, onresponse, onparsed
 * get task
 * normalize task(could use a middleware)
 * send to other middleware
 * 
 */

module.exports = class floodesh extends Emitter{
    constructor() {
	super();
	
	["_request","_response","_parsed"].forEach( (k) => this[k]=new Mof(),this);
	this.seed = [];
	this.next = [];
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
     * @api private
     */
    
    _enqueue(){
	// to worker or to bottleneck? depend on `worker` or `client`
	// jobs in this.next
	const self = this;
	this.emit('enqueue',this._normalize(this.next));// maybe it's an event for client to subscribe
	
	// local vertsion.
	this.next.forEach( t => {
	    this.bottleneck.submit( callback => {
		return ( (task,done) => {
		    let ctx = self._createContext(task);
		    ctx.done = done;
		    
		    ctx.next().value === ctx.REQ && self.requestmw.callback(self._sendWorker.bind(self))(ctx);
		})(t,callback);
	    });
	},this);
	
	
    }
    
    _sendWorker(ctx){
	const self = this;
	const req = send(ctx.opt, (err,res) => {
	    ctx.done();// tell bottleneck that current resource could be released.
	    if(err) throw err; // TODO: not very clear how to handle error. maybe emit on `ctx`
	    
	    ctx.response.res = res;
	    ctx.next().value === ctx.RES && self.responsemw.callback(self._parse.bind(self))(ctx);
	});

	ctx.request.req = req;
    }

    _parse(){
	console.log('_parse is not implemented.');
    }
    
    /**
     * Initialize a new context.
     *
     * @api private
     */

    _createContext(task){
	const ctx = context();
	const rq = ctx.request = Object.create(request);
	const rs = ctx.response = Object.create(response);
	ctx.opt = this._normalize(task);
	ctx.request.req = ctx.response.res = null;
	rq.ctx = rs.ctx = ctx;
	ctx.app = rq.app = rs.app = this;
	return ctx;
    }

    start(){
	Array.prototype.push.apply(this.next,this._getSeedRequests());//read requests(urls or options)
	if(0 === this.next.length) return;//exit if there are no seed requests
	
	/* enqueue
	 * 1. enqueue to client
	 * 2. send to worker
	 * 3. worker receive jobs
	 * 4. worker enqueue to bottleneck
	 */
	this._enqueue();
		
	//called by bottleneck
	//pass requests to request middleware
	//send request use `request` module
	//got response
	//pass response to response middleware
	//pase response
	//pass response and result(data,tasks) to pasred middleware
	/*
	 *
	 * send result to client.
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	
    }

    /**
     * Get seed requests.
     *
     * @api private
     */
    
    _getSeedRequests(){
	return this.seed.length?this.seed:this.initRequests();
    }
}
