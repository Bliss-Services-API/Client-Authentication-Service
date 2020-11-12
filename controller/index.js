/**
 * 
 * Index of All Controllers used in the Authentication Service
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (postgresClient, redisClient) => {
    const TransientTokenController = require('./TransientTokenController')(redisClient);
    const PermanentTokenController = require('./PermanentTokenController')(postgresClient);
    
    return {
        TransientTokenController,
        PermanentTokenController
    };
};