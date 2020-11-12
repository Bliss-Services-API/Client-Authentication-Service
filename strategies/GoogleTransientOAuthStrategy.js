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
module.exports = (postgresClient, redisClient) => {

    //Importing Modules
    const crypto = require('crypto');
    const { promisify } = require('util');
    const chalk = require('../chalk.console');
    const Controller = require('../controller');
    const Strategy = require('passport-google-oauth');
    const googleOAuthConfig = require('../config/google.oauth.json');
    
    //Initializing Variables
    const MagicWord = process.env.MAGIC_WORD;
    const GoogleOAuth = Strategy.OAuth2Strategy;
    const TransientTokenController = Controller(postgresClient, redisClient).TransientTokenController;
    const PermanentTokenController = Controller(postgresClient, redisClient).PermanentTokenController;

    /**
     * 
     * Google OAuth Strategy to generate transient JWT token, and also fetch some 
     * user data from their google account. Transient JWT token will only be used 
     * to create profile, and complete the registration process.
     * 
     */
    const googleTransientSignUpAuth = new GoogleOAuth(googleOAuthConfig, async (accessToken, refreshToken, profile, done) => {
        try {

            //Accumulate all the Data related to the user which will be used for 
            //Generating Transient Token.
            const currTime = new Date().getTime();
            const userEmail = profile.emails[0].value;
            const userName = profile.name.givenName + " " + " " + profile.name.familyName;
            const userPhoto = profile.photos[0].value;
            const userGender = profile.gender;

            const userEmailSalted = userEmail + "" + MagicWord;
            const userId = crypto.createHash('sha256').update(userEmailSalted).digest('base64');


            //Convert redisClient Async Functions into Promise Based Functions
            const registerUser = promisify(redisClient.set).bind(redisClient);

            //Check if User is Already Transient or Permanent Token Bearer
            const userIsTransient = await TransientTokenController.verifyTransientAccount(userEmail);
            const userIsPermanent = await PermanentTokenController.verifyPermanentAccount(userEmail);

            //If User is Permanent Registered, Return 401 (Already Authorize)
            if(userIsPermanent) {
                return done(null, {
                    ERR: 'Already Permanent',
                    CODE: '101'
                });
            }
            //If User is Transient Registered, Return Error
            else if(userIsTransient) {
                return done(null, {
                    ERR: 'Already Transient',
                    CODE: '102'
                });
            } 
            //Otherwise, return a new Transient Token
            else {
                const userData = {
                    EMAIL: userEmail,
                    USERNAME: userName,
                    PASSWORD: MagicWord,
                    ACCESS_TOKEN: accessToken,
                    REFRESH_TOKEN: refreshToken,
                    TOKEN_STATUS: 'TRANSIENT',
                    REVOKE_TIME: currTime
                };

                await registerUser(userId, JSON.stringify(userData), 'EX', 60 * 60 * 24);

                const tokenPayload = {
                    CLIENT_ID: userId,
                    TOKEN_STATUS: 'TRANSIENT',
                    REVOKE_TIME: currTime
                };

                const transientToken = TransientTokenController.generateTransientToken(tokenPayload);

                return done(null, {
                    Message: 'DONE',
                    Response: 'Registered as Transient Account',
                    TokenStatus: 'TRANSIENT',
                    Account: {
                        Email: userEmail, 
                        Username: userName,
                        ProfileImage: userPhoto,
                        Gender: userGender,
                        Token: {
                            Expires: currTime + (1000 * 60 * 60 * 24),
                            RevokeTime: currTime,
                            Token: transientToken
                        }
                    }
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