# Floodesh
Floodesh is middleware based web spider written with Nodejs. "Floodesh" is a combination of two words, `flood` and `mesh`.

# Table of Contents
- [Requirement](#requirement)
  * [Gearman Server](#gearman-server)
  * [MongoDB](#mongodb)
- [Quick start](#quick-start)
  * [Install scaffold](#install-scaffold)
  * [Initialize](#initialize)
- [Context](#context)
  * [Request](#request)
    + [ctx.querystring](#ctxquerystring)
    + [ctx.idempotent](#ctxidempotent)
    + [ctx.search](#ctxsearch)
    + [ctx.method](#ctxmethod)
    + [ctx.query](#ctxquery)
    + [ctx.path](#ctxpath)
    + [ctx.url](#ctxurl)
    + [ctx.origin](#ctxorigin)
    + [ctx.protocol](#ctxprotocol)
    + [ctx.host](#ctxhost)
    + [ctx.hostname](#ctxhostname)
    + [ctx.secure](#ctxsecure)
  * [Response](#response)
    + [ctx.status](#ctxstatus)
    + [ctx.message](#ctxmessage)
    + [ctx.body](#ctxbody)
    + [ctx.length](#ctxlength)
    + [ctx.type](#ctxtype)
    + [ctx.lastModifieds](#ctxlastmodifieds)
    + [ctx.etag](#ctxetag)
    + [ctx.header](#ctxheader)
    + [ctx.contentType](#ctxcontenttype)
    + [ctx.get(key)](#ctxgetkey)
    + [ctx.is(types)](#ctxistypes)
  * [Other](#other)
    + [ctx.tasks](#ctxtasks)
    + [ctx.dataSet](#ctxdataset)
- [Configuration](#configuration)
  * [index](#index)
  * [bottleneck](#bottleneck)
  * [downloader](#downloader)
  * [gearman](#gearman)
  * [database](#database)
  * [logger](#logger)
  * [seenreq](#seenreq)
  * [service](#service)
- [Error handling](#error-handling)
- [Diagram](#diagram)
  * [Client](#client)
    + [State diagram](#state-diagram)
    + [Flow chart](#flow-chart)
  * [Worker](#worker)
- [Middlewares](#middlewares)

# Requirement
## [Gearman Server](http://gearman.org/)
Make sure `g++`, `make`, `libboost-all-dev`, `gperf`, `libevent-dev` and `uuid-dev` have been installed.

```sh
$ wget https://launchpad.net/gearmand/1.2/1.1.12/+download/gearmand-1.1.12.tar.gz | tar xvf
$ cd gearmand-1.1.12
$ ./configure
$ make
$ make install
```

## [MongoDB](https://www.mongodb.org/)

# Quick start
## Install scaffold
```sh	
$ npm install -g floodesh-cli
```

## Initialize
Generate new app from templates by only one command.

```sh
$ mkdir demo
$ cd demo
$ floodesh-cli init # all necessary files will be generated in your directory.
```

Please make sure you have /data/tests and /var/log/bda/tests created and have Write access before use, you can customize path by modifying logBaseDir in config/[env]/index.js 

# Context
A context instance is a kind of [Finite-State Machine](https://en.wikipedia.org/wiki/Finite-state_machine) implemented by `Generators` which is [ECMAScript 6](http://es6-features.org/#GeneratorFunctionIteratorProtocol) feature. By context, we can access almost all fields in `response` and `request`, like:

```javascript
worker.use( (ctx,next) => {
    ctx.content = ctx.body.toString(); // totally do not care about the body 
    return next();
})
```

## Request

### ctx.querystring
  *  <String\>

Get querystring.

### ctx.idempotent
  *  <Boolean\>
  
Check if the request is idempotent.

### ctx.search
  *  <String\>
  
Get the search string. It includes the leading "?" compare to querystring.

### ctx.method
  *  <String\>
  
Get request method.

### ctx.query
  *  <Object\>
  
Get parsed query-string.

### ctx.path
  *  <String\>
  
Get the request pathname

### ctx.url
  *  <String\>
  
Return request url, the same as __ctx.href__.

### ctx.origin
  *  <String\>
  
Get the origin of URL, for instance, "https://www.google.com".

### ctx.protocol
  *  <String\>
  
Return the protocol string "http:" or "https:".

### ctx.host
  * <String\>, hostname:port
  
Parse the "Host" header field host and support X-Forwarded-Host when a proxy is enabled.

### ctx.hostname
  * <String\>
  
Parse the "Host" header field hostname and support X-Forwarded-Host when a proxy is enabled.

### ctx.secure
  * <Boolean\>
  
Check if protocol is https.

## Response

### ctx.status
  *  <Number\>
  
Get status code from response.

### ctx.message
  *  <String\>
  
Get status message from response.

### ctx.body
  *  <Buffer\>
  
Get the response body in Buffer.

### ctx.length
  *  <Number\>
  
Get length of response body.

### ctx.type
  *  <String\>
  
Get the response mime type, for instance, "text/html"

### ctx.lastModifieds
  *  <Date\>
  
Get the Last-Modified date in Date form, if it exists.

### ctx.etag
  *  <String\>
  
Get the ETag of a response.

### ctx.header
  *  <Object\>
  
Return the response header.

### ctx.contentType
  *  <String\>

### ctx.get(key)
  *  `key` <String\>
  *  Return: <String\>

Get value by key in response headers

### ctx.is(types)
  *  `type`s <String\>|Array\>
  *  Return: <String\>|false|null

Check if the incoming response contains the "Content-Type" header field, and it contains any of the give mime `type`s.If there is no response body, `null` is returned.If there is no content type, `false` is returned.Otherwise, it returns the first `type` that matches.

## Other


### ctx.tasks
 * <Array\>

Array of generated tasks. A task is an object consists of [Options](https://github.com/request/request#requestoptions-callback) and `next`, `next` is a function name in your spider you want to call in next task , Supported format:

```
[{
    opt:<Options>,
    next:<String>
}]
```

### ctx.dataSet
 * <Map\>

A map to store result, that will be parsed and saved by floodesh.

# Configuration
## index
* `retry` <Integer\>: Retry times at worker side, default `3`
* `logBaseDir` <String\>: Directory where project's log directory exists, default '/var/log/bda/'
* `parsers` <Array\>: Array of parsers, which are file names in parser directory without '.js'

## bottleneck
* `defaultCfg` <Object\>
  * `rate` <Integer\>: Number of milliseconds to delay between each requests
  * `concurrent` <Integer\>: Size of the worker pool
  * `priorityRange` <Integer\>: Range of acceptable priorities starting from 0, default `3`
  * `defaultPriority` <Integer\>: priority of the request
  * `homogenous` <Boolean\>:true

## downloader
* `headers` <Object\>: [HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

## gearman
* `jobs` <Integer\>: Max number of jobs per worker, default `1`
* `srvQueueSize` <Integer\>: Max number of jobs queued to gearman server, default `1000`
* `mongodb` <String\>: [Mongodb Connection String URI](https://docs.mongodb.com/manual/reference/connection-string/),
* `worker` <Object\>:
  * `servers` <Array\>: Array of server list, server should be an object like `{'host':'gearman-server'}`
* `client` <Object\>:
  * `servers` <Array\>: Same as above,
  * `loadBalancing` <String\>: 'RoundRobin'
* `retry` <Integer\>: Retry times at client side


## database
* `mongodb` <String\>: [Mongodb Connection String URI](https://docs.mongodb.com/manual/reference/connection-string/)

## logger

## seenreq
* `repo` <String\>: [redis|mongodb] default use memory as repo.
* `removeKeys` <Array\>:Array of keys in query string to skip when test if an url is seen

## service
* `server` <String\>: Remote service origin


# Error handling
Just throw an `Error` in a synced middleware, otherwise return a rejected Promise. `err.stack` will be logged and `err.code` will be sent to client to persist.

```javascript
// sync
module.exports = (ctx, next) => {
    // balabala
    throw new Error('crash here');
}

// async
module.exports = (ctx, next) => {
    return new Promise( (resolve, reject) => {
        // balabala
        reject(new Error('got error'));
    });
}
```
# Diagram
## Client
### State diagram
![floodesh client state](https://user-images.githubusercontent.com/1272762/47698740-72b62e00-dc4b-11e8-9c7d-74f54522ac52.png)
### Flow chart
![floodesh client flow](https://user-images.githubusercontent.com/1272762/47699129-dbea7100-dc4c-11e8-89c3-29173d516104.png)
## Worker
### Flow chart
![floodesh worker flow](https://user-images.githubusercontent.com/1272762/47721732-bb8dd700-dc8b-11e8-9201-34ad3f14aa09.png)
# Middlewares
 * [mof-cheerio](https://www.npmjs.com/package/mof-cheerio): A simple wrapper of `Cheerio`.
 * [mof-charsetparser](https://www.npmjs.com/package/mof-charsetparser): Parse `Charset`  in response headers.
 * [mof-iconv](https://www.npmjs.com/package/mof-iconv): Encoding converter middleware using `iconv` or `iconv-lite`.
 * [mof-request](https://www.npmjs.com/package/mof-request): A wrapper of `Request.js`, with some default options.
 * [mof-bottleneck](https://www.npmjs.com/package/mof-bottleneck): A wrapper of `bottleneckp` which is asynchronous rate limiter with priority.
 * [mof-proxy](https://www.npmjs.com/package/mof-proxy): With power to acquire proxy from a proxy service.
 * [mof-whacko](https://www.npmjs.com/package/mof-whacko): A wrapper of `whacko`, which is a fork of cheerio that uses parse5 as an underlying platform.
 * [mof-statsd](https://www.npmjs.com/package/mof-statsd): A wrapper of `statsd-client`, which enables you send metrics to a statsd daemon.
 * [mof-uarotate](https://www.npmjs.com/package/mof-uarotate): Rotate `User-Agent` header automatically from a local file.
 * [mof-seenreq](https://www.npmjs.com/package/mof-seenreq): Only make sense in [flowesh](https://www.npmjs.com/package/flowesh), a simple wrapper of `seenreq`.
 * [mof-validbody](https://www.npmjs.com/package/mof-validbody): Check if a response body meets a pattern, for instance, a html body should start with `<` and json body `{`.
 * [mof-statuscode](https://www.npmjs.com/package/mof-statuscode): Status code detector.
 * [mof-genestamp](https://www.npmjs.com/package/mof-genestamp): Prints gene and url of a task, along with # of new tasks and # of records.

