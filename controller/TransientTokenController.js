'use strict';

/**
 * 
 * Controller for Handling Operations related to the Transient Token.
 * 
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (redisClient) => {
    
    //Importing Modules
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const jwt = require('jsonwebtoken');
    const { promisify } = require('util');

    //Initializing Variables
    const MagicWord = process.env.MAGIC_WORD;

    /**
     * 
     * Generate a New Transient Token for a New User
     * 
     * @param {json} payload Generate a New Transient Token, for a user, requesting to register
     * as Permanent User
     * @returns jwt, Transient Token for the user who passed the payload.
     * 
     */
    const generateTransientToken = (payload) => {
        const privateKeyPath = path.join(__dirname, "../private/twilight_ecc_private_key.pem")
        const twilightPrivateKey = fs.readFileSync(privateKeyPath);
        
        const token = jwt.sign(payload, twilightPrivateKey, {
                    algorithm: 'ES512',
                    expiresIn: "1d",
                    issuer: 'Bliss LLC.',
                    mutatePayload: true
                });
    
        return token;
    };

    /**
     * 
     * Generate a New Permanent Token for a New User Registered
     * 
     * @param {string} userEmail Returns a New Transient Token
     * @returns jwt, Transient Token
     * 
     */
    const regenerateTransientToken = async userEmail => {
        const idUnEncrypted = userEmail + "" + MagicWord;
        const userId = crypto.createHash('sha256').update(idUnEncrypted).digest('base64');

        const getTransientUsers = promisify(redisClient.get).bind(redisClient);
        const userTransient = await getTransientUsers(userId);
                
        if(!userTransient) {
            return {
                ERR: `No Transient Account Found for User Email: ${userEmail}`,
                Code: `201`
            };
        } else {
            const user = JSON.parse(userTransient);

            const payload = {
                CLIENT_ID: userId,
                TOKEN_AUTHORIZATION: 'TRANSIENT',
                REVOKE_TIME: user.REVOKE_TIME
            };

           const token = generateTransientToken(payload);
        
            return {
                Message: 'DONE',
                Response: 'Transient Token is Regenerated',
                Email: userEmail,
                Token: token,
                Expires: user.REVOKE_TIME + (1000 * 60 * 60 * 24),
                RevokeTime: user.REVOKE_TIME
            };
        }
    };

    /**
     * 
     * Verify if the Email Address of the User is Registered as a Transient Account
     * 
     * @param {string} userEmail Email of the Client whose account is being verified as permanent
     * @returns boolean. true, if email address is associated with a permanent account, or false
     * if it is not a permanent account.
     * 
     */
    const verifyTransientAccount = async userEmail => {
        const userEmailSalted = userEmail + "" + MagicWord;
        const userId = crypto.createHash('sha256').update(userEmailSalted).digest('base64');

        const getTransientUsers = promisify(redisClient.get).bind(redisClient);
        const userTransient = await getTransientUsers(userId);
                
        if(userTransient) return true;
        else return false;
    };

    /**
     * 
     * Verify the Token Provided is Transient, and then Decode the Token and returns the Payload
     * 
     * @param {jwt} token Transient Token, which needs to be decoded
     * @returns object. If Token is verified as authentic and bearer is genuine, it returns the payload
     * of the Token. If A Permanent Token is passed, it returns false. If the token is malformed, tampered
     * or being used in wrong way, it return the proper error according to the way the token is being 
     * passed and how it's being used.
     * 
     */
    const decodeTransientToken = token => {
        const publicKeyPath = path.join(__dirname, "../private/twilight_ecc_public_key.pem")
        const twilightPublicKey = fs.readFileSync(publicKeyPath);
        
        try {
            const payload = jwt.verify(token, twilightPublicKey, {
                algorithm: 'ES512',
                issuer: 'Bliss LLC.'
            });

            if(payload.TOKEN_AUTHORIZATION === 'TRANSIENT') {
                return payload;
            }
            else {
                return false;
            }
        }
        catch(err) {
            if(err.name === 'TokenExpiredError'){
                return {
                    ERR: 'TokenExpired',
                    CODE: '301'
                };
            }
            else if(err.name === 'JsonWebTokenError'){
                return {
                    ERR: err.message,
                    CODE: '302'
                };
            }
            else if(err.name === 'NotBeforeError') {
                return {
                    ERR: 'Token Not Active',
                    CODE: '303'
                };
            }
            else {
                return err;
            }
        }
    };

    return {
        regenerateTransientToken,
        generateTransientToken,
        verifyTransientAccount,
        decodeTransientToken
    };
}