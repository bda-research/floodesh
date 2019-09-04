
'use strict';

const should = require('should');
const sequenceBatches = require('../lib/batchInsert.js');
const MongoClient = require('mongodb').MongoClient;
// const sinon = require('sinon');
// require('should-sinon');


describe('batchInsert', ()=>{
	let mongo = null;
	beforeEach(done => {
		MongoClient.connect('mongodb://bdaserver:27017/floodeshtest')
			.then(db=>{
				mongo=db;
				console.log('connected!');
			})
			.then(done)
			.catch(e => console.error(e.message));
	});

	afterEach(done => {
		mongo.close();
		done();
	});

	it('should ', (done)=>{
		const collection = 'taskgenerate';
		const batchSize = 1;
		const items = [{name:'Mike Chen'},{name:'John Chen'}];

		mongo.collection(collection).deleteMany({})
			.then(() => sequenceBatches({client: mongo, collection, batchSize}, items))
			.then(rst => {
				should.equal(rst.ok, 1);
				return mongo.collection(collection).count({});
			}).then(n => should.equal(n, 2)).then(done).catch(done);
	});
});
