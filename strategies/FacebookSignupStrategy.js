'use strict';

//
//
//
//
//
//  WARNING: NOT INTEGRATED WITH THE SERVICES YET. DON'T USE THIS STRATEGY
//
//
//
//

/**
 * 
 * Module to handle Facebook OAuth Strategy, which will help in generating transient JWT token, and also
 * fetch some user data from their facebook account.
 * 
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (postgresClient, S3Client) => {
    const crypto = require('crypto');
    const Strategy = require('passport-facebook');
    const facebookOAuthConfig = require('../config/facebook.oauth.json');

    const controller = require('../controller');
    const clientSignupController = controller(postgresClient, S3Client).clientSignupController;
    const MagicWord = process.env.MAGIC_WORD;
    const FacebookOAuth = Strategy.Strategy;
    
    /**
     * 
     * Facebook OAuth Strategy to generate transient JWT token, and also fetch some 
     * user data from their facebook account. Transient JWT token will only be used 
     * to create profile, and complete the registration process.
     * 
     */
    const facebookTransientSignUpAuth = new FacebookOAuth(facebookOAuthConfig, async (accessToken, refreshToken, profile, done) => {
        try {
            const userEmail = profile.emails[0].value;
            const userName = profile.name.givenName + " " + " " + profile.name.familyName;
            const userPhoto = profile.photos[0].value;
            const userBirthday = profile.birthday;
         
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
                    CODE: 'FACEBOOK_PROFILE_FETCHED',
                    EMAIL: userEmail,
                    NAME: userName,
                    PROFILE_IMAGE: userPhoto,
                    DOB: userBirthday
                });
            }
        }
        catch(err) {
            console.error(`Facebook OAuth Strategy Authentication Error!\n` + chalk.error(`${err}`))
            return done({
                ERR:err.message
            });
        }   
    });

    return facebookTransientSignUpAuth;
}