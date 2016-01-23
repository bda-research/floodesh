
'use strict';

const core = require('./core')

module.exports = class client{
    init(){
	core.on('enqueue', (tasks) => {
	    //send to worker or not.

	    console.log();
	});
    }
}
