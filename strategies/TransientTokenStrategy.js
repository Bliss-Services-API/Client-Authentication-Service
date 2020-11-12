'use strict';

/**
 * 
 * Module to handle Basic Auth Strategy, which will help in generating transient JWT token.
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (postgresClient, redisClient) => {
    const chalk = require('../chalk.console');
    const Controller = require('../controller');
    const crypto = require('crypto');
    const { promisify } = require('util');
    const Strategy = require('passport-http');

    const MagicWord = process.env.MAGIC_WORD;
    const BasicStrategy = Strategy.BasicStrategy;
    const TransientTokenController = Controller(postgresClient, redisClient).TransientTokenController
    const PermanentTokenController = Controller(postgresClient, redisClient).PermanentTokenController;
    
    /**
     * 
     * Creta a transient token for new users on registration. This token will only be accessible
     * for creating profile and completing the registration. Every other server will throw error
     * on accessing their API using the transient token.
     * 
     */
    const transientSignUp = new BasicStrategy({passReqToCallback: true}, async (req, username, password, done) => {
        try {
            const currTime = new Date().getTime();
            const userEmail = req.body.email;

            if(!userEmail) {
                return done(null, 'Email Not Provided');
            } else {
                const userEmailSalted = userEmail + "" + MagicWord;
                const userId = crypto.createHash('sha256').update(userEmailSalted).digest('base64');

                const registerUser = promisify(redisClient.set).bind(redisClient);

                const userTransient = await TransientTokenController.verifyTransientAccount(userEmail);
                const userPermanent = await PermanentTokenController.verifyPermanentAccount(userEmail);

                //If User is Permanent, Return 401 (Already Authorize)
                if(userPermanent) {
                    return done(null, {
                        ERR: 'Already Permanent',
                        CODE: '101'
                    });
                }
                //If User is transient, return the last time revoked transient token
                else if(userTransient) {
                    return done(null, {
                        ERR: 'Already Transient',
                        CODE: '102'
                    });
                } 
                //If User is transient, return the last time revoked transient token
                else {
                    const userData = {
                        EMAIL: req.body.email,
                        USERNAME: username,
                        PASSWORD: password,
                        TOKEN_STATUS: 'TRANSIENT',
                        REVOKE_TIME: currTime
                    };

                    await registerUser(userId, JSON.stringify(userData), 'EX', 60 * 60 * 24);
                            
                    const payload = {
                        CLIENT_ID: userId,
                        TOKEN_AUTHORIZATION: 'TRANSIENT',
                        REVOKE_TIME: currTime
                    };

                    const transientToken = TransientTokenController.generateTransientToken(payload);

                    return done(null, {
                        Message: 'DONE',
                        Response: 'Registered as Transient Account',
                        TokenStatus: 'TRANSIENT',
                        Email: req.body.email,
                        UserId: userId,
                        Username: username, 
                        Token: transientToken,
                        Expires: currTime + (1000 * 60 * 60 * 24),
                        RevokeTime: currTime
                    });
                }
            }
        }
        catch(err) {
            console.error(`Transient Basic Strategy Authentication Error!\n` + chalk.error(`${err}`))
            return done(err);
        }
    });

    return transientSignUp;
}