#!/usr/bin/env node

"use strict";

/**
 * Module dependencies.
 */

const program = require('commander');
let App = null, app=null

program
    .version('0.0.1')
    .option('-c, --client', 'run as client')
    .option('-w, --worker', 'run as worker')
    .option('-r, --recover','recover mode, read seed from database')
    .option('-n, --name<name>','app to run')
    .parse(process.argv);

console.log('run floodesh as:');

if (program.client) {
    console.log('  - client');
    // do client stuff
    App = require("./lib/client.js");
}

if (program.worker){
    console.log('  - worker');
    // do worker stuff
    App = require("./lib/worker.js")
}

app = new App()
app.start()
