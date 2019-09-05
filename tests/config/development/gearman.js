
'use strict';

module.exports={
	jobs:1,
	srvQueueSize:10000,
	mongodb:'mongodb://bdaserver:27017/test',
	worker:{
		servers:[{'host':'bdaserver'}]
	},
	client:{
		servers:[{'host':'bdaserver'}],
		loadBalancing: 'RoundRobin'
	}
};
