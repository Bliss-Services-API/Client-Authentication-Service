'use strict';

/**
 * 
 * Model of the client-credentials Table in the Database credentials;
 * 
 * @param {Sequelize Object} databaseConnection Sequelize Object
 * 
 */
module.exports = (databaseConnection) => {
    const Sequelize = require('sequelize');
    
    const ClientCredentialModel = databaseConnection.define('client-credential', {
        client_id:           { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        client_email:        { type: Sequelize.STRING, allowNull: false },
        client_name:         { type: Sequelize.STRING, allowNull: false },
        client_password:     { type: Sequelize.STRING, allowNull: false },
        token_last_revokes:  { type: Sequelize.DATE, allowNull: false }
    }, {
        timestamps: false
    });
    return ClientCredentialModel;   
}