
'use strict'

module.exports = (ctx, next)=>{
    console.log("in home parser: %s",ctx.url);
    return next();
};