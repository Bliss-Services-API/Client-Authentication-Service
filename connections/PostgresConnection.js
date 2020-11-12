'use strict';

/**
 * Connection config for the postgres database 'celebs' which stores the data of celebs. Returns both 
 * development as well as production database connection objects.
 * 
 * @param {String} mode Either 'development' or 'production', refers to the environment of the server running
 */
 module.exports = (mode) => {
    const Sequelize = require('sequelize');
    const config = require('../config/config.json');

    if(mode == 'development') {
    /**
     * 
     * Return the Sequelize connection for the development database
     * 
     */
        return new Sequelize(config.development.database, config.development.username, config.development.password, {
            host: config.development.host,
            port: config.development.port,
            dialect: config.development.dialect,
            logging: console.log,
            pool: {
                max: 5,
                min: 0,
                idle: 1000
            },
        });
    }

    else {

    /**
     * 
     * Return the Sequelize connection for the production database
     * 
     */
        return new Sequelize(config.production.database, config.production.username, config.production.password, {
            host: config.production.host,
            port: config.production.port,
            dialect: config.production.dialect,
            logging: console.log,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            pool: {
                max: 100,
                min: 0,
                idle: 1000
            }
        });
    }
}