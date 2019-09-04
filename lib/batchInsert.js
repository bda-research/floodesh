
'use strict';

const {reduce, splitEvery} = require('ramda');

const initBulkOp = (client, collection) => client.collection(collection).initializeUnorderedBulkOp();
const op = (bulk, item) => bulk.insert(item) && bulk;
const execBatchOp = (client, collection, op, items) => reduce(op, initBulkOp(client, collection), items).execute();

// const batchByBatch = (batch) => batchUpsert(client, db, collection, op, batch);
const sequenceBatches = ({client, collection, batchSize=10000}, items) => reduce(
	(p, batch) => p.then(() => execBatchOp(client, collection, op, batch)),
	Promise.resolve(),
	splitEvery(batchSize, items)
);

module.exports = sequenceBatches;

