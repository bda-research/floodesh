
/* 
 * Expose Worker and Client AS API
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

module.exports = {
    get Worker(){
	return require('./lib/worker.js');
    },
    get Client(){
	return require('./lib/client.js');
    }
}
