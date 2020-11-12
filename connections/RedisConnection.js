'use strict';

/**
 * 
 * Returns Redis Client based on Environment of Server Running
 * 
 * @param {Redis Object} redis Redis Client Object
 * @param {String} mode Environment of Server Running. Either 'development' or 'production'
 */
module.exports = (mode) => {
    const redis = require('redis');
    const RedisClustr = require('redis-clustr');
    const redisConfig = require('../config/redis.json');

    if(mode === 'development') {
        return redis.createClient({
            host: redisConfig.development.REDIS_HOST,
            port: redisConfig.development.REDIS_PORT,
            auth_pass: redisConfig.development.REDIS_PASSWORD
        });
    } else {
        return new RedisClustr({
            servers: [
                {
                    host: redisConfig.production.REDIS_HOST,
                    port: redisConfig.production.REDIS_PORT
                }
            ],
            createClient: (port, host) => {
                return redis.createClient({
                    host: host,
                    port: port,
                    auth_pass: redisConfig.production.REDIS_PASSWORD
                });                
            },
        });
        
    }
}