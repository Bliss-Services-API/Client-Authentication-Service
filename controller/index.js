module.exports = (postgresClient, S3Client) => {
    const clientSignupController = require('./ClientSignupController')(postgresClient, S3Client);

    return {
        clientSignupController
    };
}