
'use strict'

module.exports = (ctx, next)=>{
    console.log("in home parser: %s",ctx.url);
    console.log(ctx.$("title").text());
    return next();
};
