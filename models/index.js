module.exports = postgresClient => {
    const ClientCredentialModel = require('./ClientCredentialModel')(postgresClient);
    const ClientProfileModel = require('./ClientProfileModel')(postgresClient);

    return {
        ClientCredentialModel,
        ClientProfileModel
    };
}