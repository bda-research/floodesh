var WC = require('../index.js')
var wc = new WC()
wc.use('request','/',function(err,req,res,next){
    if(err){
	console.log(err);
	//return;
    }
    
    console.log("everything on request.");

    next();
});

wc.use('request',function(err,req,res,next){
    if(err){
	console.log(err);
    }
    
    console.log("everything no route of request");
    
    next();
});

wc.use('request','/q',function(err,req,res,next){
    if(err){
	console.log(err);
    }
    console.log("request /q");
    next();
});


wc.use('process','/',function(err,req,res,next){
    if(err){
	console.log(err);
    }

    console.log("everything on processing");

    next();
});

wc.use('process','/bbc',function(err,req,res,next){
    if(err){
	console.log(err);
    }

    console.log("bbc on processing");

    next();
});

wc.use('processed','/',function(err,req,res,next){
    if(err){
	console.log(err);
    }

    console.log("everything on processed");

    next();
});


// wc._handle('request',{uri:'http://www.baidu.com/'},{},function(){
//     console.log("request end");
// });

// wc._handle('request',{uri:'http://www.baidu.com/q'},{},function(){
//     console.log('request /q done');
// })

wc._handle('process',{uri:'http://www.baidu.com/bbc'},{},function(){
    console.log("process end");
})
