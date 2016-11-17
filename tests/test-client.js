
"use strict"

const should = require('should')
const path = require('path')
const sinon = require('sinon')
require('should-sinon')
const Client = require('../client')

describe('Test client in floodesh', ()=>{
    //process.chdir(path.join(process.cwd(),'tests'));
    beforeEach(() => {
	
    });

    it('should load config file', ()=>{
	let app = new Client();
	
	should.exist(app.config.logBaseDir);
	should.exist(app.config.gearman);
	should.exist(app.config.logger);
	should.exist(app.config.mongodb);
    });

    it('should load seed file',()=>{
	let app = new Client();
	app._init = sinon.spy();
	app.attach({});
	app.start();
	app._init.should.be.calledOnce();
	app.seed.length.should.be.equal(20);
    });
});
