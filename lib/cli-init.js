
"use strict";

/**
 * Module dependencies.
 */

const program = require('commander')
const env = process.env.NODE_ENV || "development"
const path = require('path')
const fs = require('fs')

const dirApp=process.cwd()
let appName = null;

function genSpider(){
    const tplFile = path.join(__dirname,'..','templates','lib','spider.tpl');
    let tpl = eval(fs.readFileSync(tplFile).toString());
    fs.writeFileSync( path.join(dirApp,'lib','spider.js') ,tpl);
}

function genPackage(){
    const tplFile = path.join(__dirname,'..','templates','package.tpl');
    let tpl = eval(fs.readFileSync(tplFile).toString());
    fs.writeFileSync( path.join(dirApp,'package.json') ,tpl);
}

function genClient(){
    const tplFile = path.join(__dirname,'..','templates','lib','client.tpl');
    let tpl = eval(fs.readFileSync(tplFile).toString());
    fs.writeFileSync( path.join(dirApp,'lib','client.js') ,tpl);
}

function checkName(){
    if(appName) return;
    
    let idxSep = dirApp.lastIndexOf(path.sep);
    appName = dirApp.slice(idxSep+path.sep.length);
}

function checkAccess(){
    // no need to check
}

function checkDirectory(){
    fs.mkdirSync(path.join(dirApp,"lib"));
    fs.mkdirSync(path.join(dirApp,"test"));

    // fs.mkdirSync(path.join("/data",appName));// not compatible with windows.
    // fs.mkdirSync(path.join("/var/log",appName));
}

function cpy(){
    ["index.js","config.json","worker.js"].forEach( filename => {
	let source = path.join(__dirname,'..','templates',filename)
	, dest = path.join(dirApp,filename);
	
	fs.createReadStream(source).pipe(fs.createWriteStream(dest));
    });

    fs.createReadStream( path.join(__dirname,'..','templates','test','test-spider.js') ).pipe(fs.createWriteStream( path.join(dirApp,'test','test-spider.js') ));
}

program
    .version('0.1.0')
    .arguments('[name]')
    .action(name => appName  = name)
    .parse(process.argv);

console.log('Floodesh initialize, version 0.1.0');
checkName();

console.log(' - App Name: %s',appName);
console.log(' - create directories');
checkDirectory();
console.log(' - generate files from templates');
genPackage();
genSpider();
genClient();
console.log(' - copy files from templates');
cpy();
console.log("Initialize success.");
console.log(`Please make sure you have /data/${appName} and /var/log/${appName} created and have Write access before use`);
