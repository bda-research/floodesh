
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
	return require('./worker/');
    },
    get Client(){
	return require('./client/');
    }
}
