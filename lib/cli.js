
"use strict";

/**
 * Module dependencies.
 */

const program = require('commander')

program
    .version('0.1.0')
    .command('init','generate scaffold')
    .command('start [mode]','start in worker or client mode.')
    .parse(process.argv);

