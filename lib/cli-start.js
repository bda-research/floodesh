
"use strict";

/**
 * Module dependencies.
 */

const program = require('commander')
const path = require('path')
const guvnor = require('guvnor').Local
const env = process.env.NODE_ENV || "development"
const dirApp=process.cwd(), meta = require(path.join(dirApp,"meta.json")), clientName = "client.js", workerName="worker.js";
let App = null, app=null, entry=null,appPath = path.join(dirApp,"lib"),  processOptions = {env:env,name:meta.name};

program
    .option('-c, --client', 'run as client')
    .option('-w, --worker', 'run as worker')
    .option('-r, --recover','recover mode, read seed from database')
    //.option('-n, --name<name>','app to run')
    .parse(process.argv);

console.log('mode');

if (program.client) {
    console.log('  - client');
    appPath = path.join(appPath,clientName);
    processOptions.name += clientName;
}

if (program.worker){
    console.log('  - worker');
    appPath = path.join(appPath,workerName);
    processOptions.name += workerName;
}

console.log(appPath);
console.log(processOptions);

// app = new App(require(path.join(dirApp,configFile))[env]);
// app.attach(new entry()).start();

// guvnor.connectOrStart(function(error, daemon) {
//     if(error) throw error;
//     console.log("guv daemon connected");
    
//     daemon.startProcess(appPath,processOptions,function(error, processInfo){
// 	if(error){
// 	    console.error(error);
// 	    throw error;
// 	}
	
// 	console.log("process starting...");
// 	daemon.on('process:ready', function(readyProcessInfo) {
// 	    if(processInfo.id == readyProcessInfo.id) {
// 		console.log("process has now started [%d]",readyProcessInfo.pid);
// 	    }else{
// 		console.error("error when starting process");
// 	    }
	    
// 	    daemon.disconnect(function (error) {
// 		if(error) throw error;
// 		console.log("guv daemon disconnected");
// 	    })
// 	})
//     });
// })
