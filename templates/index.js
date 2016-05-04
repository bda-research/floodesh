
"use strict"

/**
 * Module dependencies.
 */

const Client = require("floodesh").Client
const env = process.env.NODE_ENV || "development"
const config = require("./config.json")[env]
const App = require('./lib/client.js')

/* 
 *  Attach app  to `Client` instance
 *  
 */

new Client(config).attach(new App()).start();
