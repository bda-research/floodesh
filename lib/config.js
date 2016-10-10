
'use strict'

const path = require('path')
const fs = require('fs')
const env = process.env.NODE_ENV || "development"

let configDir = path.join(process.cwd(),'config', env);
let config = module.exports = require(configDir);

fs.readdirSync(configDir)
    .filter(name=>name.slice(0,5)!=="index" && name.match(/\.js$/))
    .forEach(name => config[name.replace(/\.js$/,'')]=require(path.join(configDir,name)));

