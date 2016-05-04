
"use strict"

/**
 * Module dependencies.
 */

const Worker = require("floodesh").Worker
const cheerio = require("mof-cheerio")

const env = process.env.NODE_ENV || "development"
const config = require("./config.json")[env]
const Spider = require('./lib/spider.js')

/* 
 *  Attach `Spider` instance to `Worker` instance
 *  
 */

const worker = new Worker(config).attach(new Spider());

/*
 * default convert <Buffer> to <String> in UTF-8
 */
worker.responsemw.use( (ctx,next) => {
    ctx.content = ctx.body.toString();
    return next();
})
worker.responsemw.use(cheerio())

worker.start()
