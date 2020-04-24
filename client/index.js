
'use strict';

const Emitter = require('events');
const fs = require('fs');
const seenreq = require('seenreq');
const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const gearman = require('gearman-node-bda');
const path = require('path');
const sequenceBatches = require('../lib/batchInsert.js');

const config = require('../lib/config.js');
const StatusJob = require('../lib/status.js');
const Job = require('../lib/job.js');

let logClient = winston.loggers.get('Client');

const JOB_END = 'end';
const JOB_START = 'start';
const JOB_QUEUE = 'queue';
const CLIENT_READY = 'ready';
const DEFAULT_FN = 'parse';
const DEFAULT_PRIORITY = 1;

let args = process.argv.slice(2);

function* StateClient(){
	yield 'ready';
	yield 'running';
	yield 'stop';
}

module.exports =  class Client extends Emitter{
	constructor(){
		super();
		this.serverTasks=[];
		this.dbTasks=[];
		this.db = null;
		this.srvQueueSize = config.gearman.srvQueueSize||100;
		this.gearmanClient = gearman.client(config.gearman.client);
		this.config = config;
		this.logClient = logClient;
		this.state = StateClient();
	}
	
	_init(){
		let self = this;
		logClient.info(this.name);
		
		let seenOptions = this.config.seenreq;
		if(seenOptions){
			seenOptions.appName=this.name;
			this.seen = new seenreq(seenOptions);
		}
		
		this.gearmanClient.on('error', err => logClient.error(err.stack) );
		this.gearmanClient.on('jobServerError', (jobServerUid,code,msg) => logClient.error(msg) );
		this.gearmanClient.on('socketError', (jobServerUid,e) => e && logClient.error(e.stack) );
		this.gearmanClient.on('socketDisconnect', (jobServerUid,e) => e && logClient.error(e.stack) );
		
		MongoClient.connect( this.config.gearman.mongodb ,function(err,db){
			if(err) throw err;
			logClient.info('Connect to mongodb success.');
			db.collection(self.name).createIndex({status:1,fetchCount:1, priority:1,_id:1});
			self.db = db;
			self.emit(CLIENT_READY);
		});
		
		this.on(JOB_START,function(job){
			logClient.debug(job.toString());
			this.serverTasks.push(0);
		});
		
		this.on(JOB_END,function(gearmanJob,status){
			this.serverTasks.pop();

			let op = {
				$set:{status:status},
				$currentDate:{
					updatedAt:{$type:'date'}
				}
			};
			
			//update mongodb
			if(status === StatusJob.failed ){
				op.$set.cause = gearmanJob.error && gearmanJob.error.code;
			}

			this.db.collection(this.name).update({
				_id:gearmanJob.jobVO._id
			},op).then(() => {
				if(this.serverTasks.length<this.srvQueueSize)
					this._dequeue(this._dehandler);
			});
			
			logClient.debug('Server queued jobs: %d',this.serverTasks.length);
		});
		
		this.on(CLIENT_READY,function(){
			this._nextState();// set client's state to ready.
			let startup = function(){
				/* TODO: deal with recover */
				if(args[0] === 'db'){
					logClient.info('Start fetching job from database.');
					this._dequeue(this._dehandler);
				}else{
					logClient.info('Start fetching job from seed.');
					this.emit(JOB_QUEUE,this.seed.map(item=>this._toJob(item)),() => this._dequeue(this._dehandler));
				}

				this._nextState();// set client's state to running.
			}.bind(this);

			if(!this.emit('init', startup))
				startup();
		});
		
		this.on(JOB_QUEUE,function(items, callback){
			if(items.length===0)
				return callback();

			this.dbTasks.push(2);
			sequenceBatches({client: this.db, collection: this.name,batchSize:10000}, items)
				.then(() => {
					logClient.silly('Inserted jobs');
					callback();
					this.dbTasks.pop();
				})
				.catch(e => {
					logClient.error(e);
					this.dbTasks.pop();
					callback();
				});
			
			// let bulk = this.db.collection(this.name).initializeUnorderedBulkOp();
			
			// for(let i =0;i<items.length;i++){
			//	bulk.insert(items[i]);
			// }
			
			// this.dbTasks.push(2);
			// logClient.silly('Inserting jobs to mongodb...');
			// //bulk.execute(callback);
			// bulk.execute(err => {
			//	logClient.silly('Inserted jobs. Here in callback.');
			//	if(err) logClient.error(err);
			//	self.dbTasks.pop();
			//	callback();
			// });
		});
	}

	_nextState(){
		let ret = this.state.next();
		if(!ret.done){
			logClient.debug('Client\'s state has changed to: %s',ret.value);
		}else{
			logClient.debug('Client has already stopped');
		}
		
		return ret.done;
	}
	
	_toJob(task){
		let opt = typeof task.opt === 'string' ? {uri:task.opt} : task.opt;
		let priority = Object.prototype.hasOwnProperty.call(task,'priority')? task.priority : (Object.prototype.hasOwnProperty.call(opt,'priority')?opt.priority:DEFAULT_PRIORITY);

		if(priority !== DEFAULT_PRIORITY){
			opt.priority = priority;
		}
		
		return Job({
			opt: opt,
			priority : priority,
			next : task.next || DEFAULT_FN,
			status : StatusJob.waiting
		});
	}
	
	_getPriority(num){
		switch(num){
		case 2:
			return 'LOW';
		case 0:
			return 'HIGH';
		case 1:
			return 'NORMAL';
		default:
			return 'NORMAL';
		}
	}

	_enqueue(jobs, callback){
		if(0 === jobs.length)
			return callback();
		
		let items = [], requests=[], self=this;
		for(let i=0;i<jobs.length;i++){
			requests.push(jobs[i].opt);
			items.push(this._toJob(jobs[i]));
		}
		
		if(!this.seen)
			return this.emit(JOB_QUEUE,items, callback);
		
		items=[];//empty final job list.
		this.dbTasks.push(3);
		this.seen.exists(requests).then( (result) => {
			self.dbTasks.pop();
			logClient.verbose(result);
			
			result.forEach(function(r,idx){
				if(r){
					return;
				}else{
					items.push(self._toJob(jobs[idx]));
				}
			});
			
			self.emit(JOB_QUEUE,items, callback);
		}).catch( (err) => {
			logClient.error(err);
			return callback();
		});
	}
	
	_dequeue(fn){
		logClient.silly('Fetching jobs from job queue');
		this.db.collection(this.name)
			.findOneAndUpdate({// filter fetchCount <=1 and status is waiting or failed
				$or:[{status:StatusJob.waiting},{status:StatusJob.failed, fetchCount:{$lte:(this.config.gearman.retry||1)}}]
			},{// update operations
				$set:{status:StatusJob.going},
				$currentDate:{
					updatedAt:{$type:'date'},
					fetchTime:{$type:'date'}
				},
				$inc:{fetchCount:1}
			},{
				sort:{
					fetchCount:1,
					priority:1,
					_id:1
				}
			},fn.bind(this));
	}

	_dehandler(err,result){
		logClient.silly('Fetched jobs. Here in callback');
		if(err){
			logClient.error(err);
		}else{
			if(result.value && result.value.opt) {
				logClient.debug('Job: %s',JSON.stringify(result.value));
				
				this._goOne(result.value);
				if(this.serverTasks.length<this.srvQueueSize){
					process.nextTick(function(){this._dequeue(this._dehandler);}.bind(this));
				}
			}else if(this.serverTasks.length===0){
				//need finalize resources.
				if(this.dbTasks.length===0 && !this._nextState()){
					this.db.close();
					this.gearmanClient.close();
					if(this.seen)
						this.seen.dispose();

					this.emit('exit');
					
					logClient.info('=====All done=====');
				}else{
					setTimeout(function(){this._dequeue(this._dehandler);}.bind(this),2000);
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
		let argv = job.opt;
		let fn = job.next;
		let priority = this._getPriority(Object.prototype.hasOwnProperty.call(job,'priority')?job.priority:DEFAULT_PRIORITY);
		
		let objJob = this.gearmanClient.submitJob(this.name+'_'+fn, JSON.stringify(argv),{background: false, priority:priority});
		objJob.jobVO = job;
		this.emit(JOB_START,objJob);
		
		logClient.debug('fn: %s, argv: %s',this.name+'_'+fn,JSON.stringify(argv));
		logClient.debug(objJob.getUid());
		
		let self = this;
		objJob.on('workData', function(data) {//all data end with \n?
			let ds = new Map(JSON.parse(data.toString()));
			if(!self.emit('data',ds,function(){}))
				logClient.warn('Nobody cares about data');

			logClient.verbose('WORK_DATA >>> ' + ds);
		});
		
		objJob.on('warning',function(data){
			objJob.error = JSON.parse(data);
		});
		
		objJob.on('failed',function(){
			logClient.debug('work failed', objJob.jobVO);
			self.emit(JOB_END, objJob,StatusJob.failed);
		});

		// deprecated
		// objJob.on("exception",function(emsg){
		//	   logClient.debug('job exception: %s',emsg);
		//	   self.emit(JOB_END,objJob,StatusJob.failed,emsg.toString());
		// });
		
		objJob.on('error',function(e){
			logClient.error('job error: %s',e.stack, objJob.jobVO);
			self.emit(JOB_END,objJob,StatusJob.failed);
		});
		
		objJob.on('timeout',function(){
			logClient.error('time out', objJob.jobVO);
			self.emit(JOB_END,objJob,StatusJob.failed);
		});
		
		objJob.on('complete', function() {
			let res=null;
			try{
				res = JSON.parse(objJob.response.toString());
			}catch(e){
				logClient.error(e);
				return;
			}

			self.emit('complete',res);
			
			// res must be a job format, cannot handle 
			self._enqueue(res,() => self.emit(JOB_END,objJob,StatusJob.success));
		});
	}

	start(){
		this._init();
		this.seed = this.seed || (fs.existsSync(path.join(process.cwd(),'seed.json')) && require(path.join(process.cwd(),'seed.json'))) || (this.initRequests && this.initRequests())|| this.config.seed;
	}
};
