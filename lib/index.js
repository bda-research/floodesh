
"use strict";

/**
 * Module dependencies.
 */

const program = require('commander')
const path = require('path')
const guvnor = require('guvnor').Local
const env = process.env.NODE_ENV || "development"
const configFile = "config.json", dirApp=process.cwd(), clientName = "client.js", workerName="worker.js";
let App = null, app=null, entry=null,appPath = path.join(dirApp,"lib");

program
    .version('0.0.3')
    .option('-c, --client', 'run as client')
    .option('-w, --worker', 'run as worker')
    .option('-r, --recover','recover mode, read seed from database')
    .option('-n, --name<name>','app to run')
    .parse(process.argv);

console.log('run floodesh as:');

if (program.client) {
    console.log('  - client');
    appPath = path.join(appPath,clientName);
    //App = require("./client.js");
}

if (program.worker){
    console.log('  - worker');
    appPath = path.join(appPath,workerName);
    //App = require("./worker.js");
}

// app = new App(require(path.join(dirApp,configFile))[env]);
// app.attach(new entry()).start();

guvnor.connectOrStart(function(error, daemon) {
    if(error) throw error;
    console.log("guv daemon connected");
    daemon.startProcess(appPath,{},function(error, processInfo){
	if(error) throw error;
	console.log("[%d] process starting...",processInfo.id);
	daemon.on('process:ready', function(error, readyProcessInfo) {
	    if(processInfo.id == readyProcessInfo.id) {
		console.log("[%d] process has now started",readyProcessInfo.id);
	    }
	    
	    daemon.disconnect(function (error) {
		if(error) throw error;
		console.log("guv daemon disconnected");
	    })
	})
    });
})
