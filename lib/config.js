
'use strict'

const fs = require('fs')
const path = require('path')
const program = require('commander')
const env = process.env.NODE_ENV || "development"

let configDir = path.join(process.cwd(),'config', env);
let config = module.exports = require(configDir);

fs.readdirSync(configDir)
    .filter(name=>name.slice(0,5)!=="index" && name.match(/\.js$/))
    .forEach(name => config[name.replace(/\.js$/,'')]=require(path.join(configDir,name)));

program
    .option('-j, --jobs [number]', '[Worker] how many jobs will be acquired from Gearman Server')
    .option('-x, --proxy [proxy]', '[Worker] http/https proxy for downloader ')
    .option('-l, --rate [millisecond]','[Worker] rate limits for downloader')
    .option('-u, --ua [user-agent]','[Worker] user-agent for downloader')
    .option('-s, --parsers [names]',"[Worker] pasers' name to enable")
    .option('-h, --headers [headers]','[Worker] http header (json)')
    .option('-r, --service [server]','[Worker] server of service provider')
    .option('-e, --seed [array]',"[Client] seed for client")
	.option('-d, --db [uri]', "[Client] database uri")
    .option('-n, --queue [number]',"[Client] queue size on Gearman Server")
    .parse(process.argv);

if(program.jobs){
    config.gearman.jobs = program.jobs;
}

if(program.rate){
    config.bottleneck.rate = program.rate;
}

if(program.parsers){
    config.parsers = program.parsers.split(',');
}

if(program.headers){
    console.log(program.headers);
    let header = JSON.parse(program.headers);
    Object.keys(header).forEach(key=>config.downloader.headers[key]=header[key]);
}

if(program.service){
	config.service.server = program.service;
}

if(program.proxy){
    config.downloader.proxy = program.proxy;
}

if(program.ua){
    if(!config.downloader.headers)
	config.downloader.headers=Object.create(null);
    
    config.downloader.headers["User-Agent"]=program.ua;
}

if(program.queue){
    config.gearman.srvQueueSize = program.queue;
}

if(program.seed){
    config.seed = JSON.parse(program.seed);
}

if(program.db){
	config.database.mongodb = program.db;
}
