
"use strict";

/**
 * Module dependencies.
 */

const program = require('commander')
const path = require('path')
const guvnor = require('guvnor').Local
const env = process.env.NODE_ENV || "development"
const configFile = "config.json", dirApp=process.cwd()
let App = null, app=null, entry=null;

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
    entry = require(dirApp).Client;
    App = require("./client.js");
}

if (program.worker){
    console.log('  - worker');
    entry = require(dirApp).Worker;
    App = require("./worker.js");
}

app = new App(require(path.join(dirApp,configFile))[env]);
app.attach(new entry()).start();

guvnor.connectOrStart(function(error, daemon) {
    if(error) throw error
    daemon.startProcess();
    
    daemon.listProcesses(function(error, processes) {
	console.log("guv daemon connected");
	console.log(processes);
	daemon.disconnect(function (error) {
	    // ...
	    console.log("guv daemon disconnected");
	})
    })
})
