#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');

program
    .version('0.0.1')
    .option('-c, --client', 'run as client')
    .option('-w, --worker', 'run as worker')
    .option('-n, --name<name>','app to run')
    .parse(process.argv);

console.log('run floodesh as:');

if (program.client) {
    console.log('  - client');
    // do client stuff
}

if (program.worker){
    console.log('  - worker');
    // do worker stuff
}

