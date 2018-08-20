
'use strict';

module.exports = (options)=>{
	let job = Object.create(null);
	job.opt = options.opt;
	job.priority = options.priority;
	job.next = options.next;
	job.status = options.status;
	job.createdAt = new Date();
	job.updatedAt = job.createdAt;//type=datetime
	job.fetchTime = null;//type=datetime
	job.fetchCount = 0;//type="int32"
    
	return job;
};
