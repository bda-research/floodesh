# floodesh
Floodesh is middleware based web spider written with Nodejs. Floodesh is word of `flood` + `mesh`

# Requirement

# Install
	
	$ npm install floodesh

# Useage
Before you use floodesh make sure you have [gearman](http://gearman.org/) server running 	on localhost

	$ mkdir floodesh_demo
	$ cd floodesh_demo
	$ floodesh --init



First install Gearman
`
wget https://launchpad.net/gearmand/1.2/1.1.12/+download/gearmand-1.1.12.tar.gz | tar zxf
cd gearmand-1.1.12
./configure
make
make install
`

You may first install `libboost-all-dev`, `gperf`, `libevent-dev`, `uuid-dev`
