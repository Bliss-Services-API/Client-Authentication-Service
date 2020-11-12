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
module.exports = (redisClient) => {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const jwt = require('jsonwebtoken');
    const { promisify } = require('util');
    const chalk = require('../chalk.console');
    const MagicWord = process.env.MAGIC_WORD;
    const FacebookOAuth = require('passport-facebook').Strategy;
    const facebookOAuthConfig = require('../config/facebook.oauth.json');
    
    /**
     * 
     * Function to generate transient JWT token, which will only be used to create profile,
     * and complete the registration process.
     * 
     * @param {Object} payload Payload, to ingest in the Body of the trasinet JWT token.
     * 
     */
    const generateTransientToken = payload => {
        const privateKeyPath = path.join(__dirname, "../private/twilight_ecc_private_key.pem")
        const twilightPrivateKey = fs.readFileSync(privateKeyPath);
        const token = jwt.sign(payload, twilightPrivateKey, {
                    algorithm: 'ES512',
                    expiresIn: "1d",
                    notBefore: new Date().getTime() - 30,
                    issuer: 'Bliss LLC.'
                });
    
        return token;
    }

    /**
     * 
     * Facebook OAuth Strategy to generate transient JWT token, and also fetch some 
     * user data from their facebook account. Transient JWT token will only be used 
     * to create profile, and complete the registration process.
     * 
     */
    const facebookTransientSignUpAuth = new FacebookOAuth(facebookOAuthConfig, async (accessToken, refreshToken, profile, done) => {
        try {
            const currTime = new Date().getTime();
            const userEmail = profile.emails[0].value;
            const userName = profile.name.givenName + " " + " " + profile.name.familyName;
            const userPhoto = profile.photos[0].value;
            const userBirthday = profile.birthday;
            const userGender = profile.gender;

            const idUnEncrypted = userEmail + "" + MagicWord;
            const userId = crypto.createHash('sha256').update(idUnEncrypted).digest('base64');

            const getRegisteredUsers = promisify(redisClient.get).bind(redisClient);
            const registerUser = promisify(redisClient.set).bind(redisClient);

            const usersRegistered = await getRegisteredUsers(userId);
            const users = JSON.parse(usersRegistered);
            if(users) {
                if(users.TOKEN_STATUS === 'TRANSIENT') {
                    return done(null, false, {
                        Message: 'DONE',
                        Response: 'Already Registered as Transient Account',
                        TokenStatus: 'ALREADY_TRANSIENT_REGISTERED',
                        RevokeTime: users.REVOKE_TIME,
                        Expires: users.REVOKE_TIME + (1000 * 60 * 60 * 24)
                    });
                }
                else if(users.TOKEN_STATUS === 'PERMANENT') {
                    return done(null, false, {
                        Message: 'DONE',
                        Response: 'Already Registered as Permanent Account',
                        TokenStatus: 'ALREADY_PERMANENT_REGISTERED',
                        RevokeTime: users.REVOKE_TIME,
                        Expires: 'INF'
                    });
                }
            }

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

            const transientToken = generateTransientToken(tokenPayload);

            return done(null, {
                Message: 'DONE',
                Response: 'Registered as Transient Account',
                TokenStatus: 'TRANSIENT',
                Account: {
                    Email: userEmail, 
                    Username: userName,
                    ProfileImage: userPhoto,
                    Birthday: userBirthday,
                    Gender: userGender,
                    Token: {
                        Expires: currTime + (1000 * 60 * 60 * 24),
                        RevokeTime: currTime,
                        Token: transientToken
                    }
                }
            });
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