module.exports =
`

"use strict"

const logger = require('winston')
const env = process.env.NODE_ENV || "development"

logger.add(logger.transports.File, { filename: '/var/log/${appName}/spider.log' ,logstash:true,level:'info',handleExceptions:true});

if(env==="production"){
    logger.remove(logger.transports.Console);
}
logger.cli();

function ${appName}Spider(){
    this.name = "${appName}";
}

${appName}Spider.prototype = {
    constructor:${appName}Spider,
    parse:function(ctx,done){
	// do something you like.
	done();
    }
}

module.exports = ${appName}Spider

`
