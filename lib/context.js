
'use strict';

const delegate = require('delegates');

/**
 * function to get Context
 */

module.exports = function(){
    const state = {REQ:"STATE_REQUEST",RES:"STATE_RESPONSE",PARSED:"STATE_PARSED"};
    const ctx = context.bind(state)();
    ctx.state = state;
    return ctx;
}



function* context(state){
    yield this.REQ;
    yield this.RES;
    return this.PARSED;
}

/**
 * State delegation.
 */

delegate(context.prototype,'state')
    .getter("REQ")
    .getter("RES")
    .getter("PARSED");

/**
 * Response delegation.
 */

delegate(context.prototype, 'response')
    .method('get')
    .method('is')
    .getter('status')
    .getter('message')
    .getter('body')
    .getter('length')
    .getter('type')
    .getter('lastModified')
    .getter('etag')
    .getter('header')
    .getter('contentType');

/**
 * Request delegation.
 */

delegate(context.prototype, 'request')
// .method('acceptsLanguages')
// .method('acceptsEncodings')
// .method('acceptsCharsets')
// .method('accepts')
    //.method('set')
    .access('querystring')
    .access('idempotent')
// .access('socket')
    .access('search')
    .access('method')
    .access('query')
    .access('path')
    .access('url')
    .getter('origin')
//.getter('subdomains')
    .getter('protocol')
    .getter('host')
    .getter('hostname')
    // .getter('header')
    // .getter('headers')
    .getter('secure')
// .getter('stale')
// .getter('fresh')
// .getter('ips')
// .getter('ip')


