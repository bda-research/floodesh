
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
    .option('-n, --jobs [number]', 'how many jobs will be acquired from server')
    .option('-l, --rate [millisecond]','rate limits for downloader')
    .option('-x, --proxy [proxy]', 'http/https proxy for downloader ')
    .option('-u, --ua [user-agent]','user-agent for downloader')
    .option('-h, --headers [http-header]','http header (json)')
    .option('-s, --parsers [parser name list]',"pasers' name to enable")
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

if(program.proxy){
    config.downloader.proxy = program.proxy;
}

if(program.ua){
    if(!config.downloader.headers)
	config.downloader.headers=Object.create(null);
    
    config.downloader.headers["User-Agent"]=program.ua;
}
