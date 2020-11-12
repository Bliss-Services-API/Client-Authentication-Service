'use strict';

/**
 * 
 * Migration of celeb_profiles table
 * 
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
      return queryInterface.createTable('client-credentials', {
        client_id:           { type: Sequelize.STRING, allowNull: false, primaryKey: true },
        client_email:        { type: Sequelize.STRING, allowNull: false },
        client_name:         { type: Sequelize.STRING, allowNull: false },
        client_password:     { type: Sequelize.STRING, allowNull: false },
        token_last_revokes:  { type: Sequelize.DATE, allowNull: false }
        });
    },

    down: async (queryInterface, Sequelize) => {
        return queryInterface.dropTable('client-credentials');
    }
};