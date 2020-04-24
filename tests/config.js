module.exports = {
	production:{
		gearman:{
			servers:[{'host':'127.0.0.1'}]
		},
		retry:3,
		mongodb:'mongodb://10.252.25.62:27017/gearman'
	},
	development:{
		gearman:{
			servers:[{'host':'192.168.98.116'}]
		},
		retry:3,
		mongodb:'mongodb://192.168.98.116:27017/gearman'
	}
};
