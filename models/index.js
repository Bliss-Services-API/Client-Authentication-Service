module.exports = databaseConnection => {
    const ClientCredentialModel = require('./ClientCredentialModel')(databaseConnection);

    return {
        ClientCredentialModel
    };
}