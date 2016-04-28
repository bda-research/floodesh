# floodesh
Floodesh is middleware based web spider written with Nodejs. "Floodesh" is a combination of two words, `flood` and `mesh`.

# Requirement

# Install
	
	$ npm install floodesh

# Useage
Before you use floodesh make sure you have [gearman](http://gearman.org/) server running 	on localhost

	$ mkdir floodesh_demo
	$ cd floodesh_demo
	$ floodesh --init

# Context
A context instance is a kind of [Finite-State Machine](https://en.wikipedia.org/wiki/Finite-state_machine) implemented by `Generators` which is [ECMAScript 6](http://es6-features.org/#GeneratorFunctionIteratorProtocol) feature. By context, we can access almost all fields in `response` and `request`, like:

```javascript
worker.responsemw.use( (ctx,next) => {
	ctx.content = ctx.body.toString();
	return next();
})
```

## Request

__ctx.is(types)__
  * `type`s <String|Array>
  * Return: <String|false|null> 
Check if the incoming request contains the "Content-Type" header field, and it contains any of the give mime `type`s.If there is no request body, `null` is returned.If there is no content type, `false` is returned.Otherwise, it returns the first `type` that matches.

__ctx.querystring()__
  * <String>

Get querystring.

__ctx.idempotent__
  * <Boolean>
  
Check if the request is idempotent.

__ctx.search__
  * <String>
  
Get the search string. It includes the leading "?" compare to querystring.

__ctx.method__
  * <String>
  
Get request method.

__ctx.query__
  * <Object>
  
Get parsed query-string.

__ctx.path__
  * <String>
  
Get the request pathname

__ctx.url__
  * <String>
  
Return request url, the same as __ctx.href__.

__ctx.origin__
  * <String>
  
Get the origin of URL, for instance, "https://www.google.com".

__ctx.protocol__
  * <String>
  
Return the protocol string "http" or "https"

__ctx.host__
  * <String> hostname:port
  
Parse the "Host" header field host and support X-Forwarded-Host when a proxy is enabled.

__ctx.hostname__
  * <String>
  
Parse the "Host" header field hostname and support X-Forwarded-Host when a proxy is enabled.

__ctx.secure__
  * <Boolean>
  
Check if protocol is https.

## Response

__ctx.status__
  *  <Number>
  
Get status code from response.

__ctx.message__
  * <String>
  
Get status message from response.

__ctx.body__
  * <Buffer>
  
Get the response body in Buffer.

__ctx.length__
  * <Number>
  
Get length of response body.

__ctx.type__
  * <String>
  
Get the response mime type, for instance, "text/html"

__ctx.lastModifieds__
  * <Date>
  
Get the Last-Modified date in Date form, if it exists.

__ctx.etag__
  * <String>
  
Get the ETag of a response.

__ctx.header__
  * <Object>
  
Return the response header.

__ctx.href__
  * <String>

__ctx.uri__
  * <String>

__ctx.contentType__
  * <String>

__ctx.get(key)__
  * `key` <String>
  *  Return: <String>
  
Get value by key in response headers



First install Gearman

	wget https://launchpad.net/gearmand/1.2/1.1.12/+download/gearmand-1.1.12.tar.gz | tar zxf
	cd gearmand-1.1.12
	./configure
	make
	make install

You may first install `libboost-all-dev`, `gperf`, `libevent-dev`, `uuid-dev`
