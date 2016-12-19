
'use strict'

module.exports={
    jobs:1,
    srvQueueSize:10000,
    mongodb:"mongodb://192.168.98.116:27017/test",
    worker:{
	servers:[{"host":"192.168.98.116"}]
    },
    client:{
	servers:[{"host":"192.168.98.116"}],
	loadBalancing: "RoundRobin"
    }
}
