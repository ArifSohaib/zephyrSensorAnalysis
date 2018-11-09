const Logger = require('./logger.js')

const logger = new Logger();
logger.on('messageLogged',(arg)=> {
	console.log('Listener called' , arg);
});
logger.log('message');
