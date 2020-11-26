'use strict';

/**
 * 
 * Model of the client-credentials Table in the Database credentials;
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object
 * 
 */
module.exports = (postgresClient) => {
    const Sequelize = require('sequelize');
    
    const ClientProfileModel = postgresClient.define('client_profile', {
        client_id:                      { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        client_category:                { type: Sequelize.STRING, allowNull: false },
        client_dob:                     { type: Sequelize.DATE, allowNull: false },
        client_contact_number:          { type: Sequelize.BIGINT },
        client_origin_country:          { type: Sequelize.STRING, allowNull: false },
        client_bio:                     { type: Sequelize.TEXT },
        client_profile_image_link:      { type: Sequelize.STRING, allowNull: false },
        client_joining_date:            { type: Sequelize.DATE, allowNull: false },
        client_update_date:             { type: Sequelize.DATE, allowNull: false }
    }, {
        timestamps: true,
        updatedAt: 'client_update_date',
        createdAt: 'client_joining_date'
    });
    return ClientProfileModel;   
}