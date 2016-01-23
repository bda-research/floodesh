
'use strict';


const request = require('request')

module.exports = class worker {
    send(){
	var req = request(ctx.opt, (err,res) => {
	    ctx.done();// tell bottleneck that current resource could be released.
	    if(err) throw err; // TODO: not very clear how to handle error. maybe emit on `ctx`
	    
	    ctx.response.res = res;
	    ctx.next().value === ctx.RES && self.responsemw.callback(self._parse.bind(self))(ctx);
	});
	
	ctx.request.req = req;
    }

    parse(){
	//parse a page.
    }
}
