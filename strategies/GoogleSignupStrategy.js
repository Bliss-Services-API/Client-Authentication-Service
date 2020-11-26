'use strict';


/**
 * 
 * Module to Handle Google OAuth Strategy, which will help in generating Transient Token, and also
 * fetch some user data from their Google Account.
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (postgresClient, S3Client) => {

    //Importing Modules
    const crypto = require('crypto');
    const chalk = require('../chalk.console');
    const Strategy = require('passport-google-oauth');
    const googleOAuthConfig = require('../config/google.oauth.json');
    const controller = require('../controller');

    //Initializing Variables
    const clientSignupController = controller(postgresClient, S3Client).clientSignupController;
    const MagicWord = process.env.MAGIC_WORD;
    const GoogleOAuth = Strategy.OAuth2Strategy;

    /**
     * 
     * Google OAuth Strategy to generate transient JWT token, and also fetch some 
     * user data from their google account. Transient JWT token will only be used 
     * to create profile, and complete the registration process.
     * 
     */
    const googleTransientSignUpAuth = new GoogleOAuth(googleOAuthConfig, async (accessToken, refreshToken, profile, done) => {
        try {
            const userEmail = profile.emails[0].value;
            const userName = profile.name.givenName + " " + profile.name.familyName;
            const userPhoto = profile.photos[0].value;

            const userEmailSalted = userEmail + "" + MagicWord;
            const clientId = crypto.createHash('sha256').update(userEmailSalted).digest('base64');

            const userAccountExists = await clientSignupController.checkClientProfileExists(clientId);

            if(userAccountExists) {
                return done(null, {
                    ERR: 'Already Registered',
                    CODE: 'ALREADY_REGISTERED'
                });
            } else {
                return done(null, {
                    MESSAGE: 'DONE',
                    RESPONSE: 'Data Fetched',
                    CODE: 'GOOGLE_PROFILE_FETCHED',
                    EMAIL: userEmail,
                    NAME: userName,
                    PROFILE_IMAGE: userPhoto
                });
            }
        }
        catch(err) {
            console.error(`Google OAuth Strategy Authentication Error!\n` + chalk.error(`${err}`))
            return done({
                ERR:err.message
            });
        }
    });

    return googleTransientSignUpAuth;
}