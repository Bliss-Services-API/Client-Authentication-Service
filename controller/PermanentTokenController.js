'use strict';

/**
 * 
 * Controller for Handling Operations related to the Permanent Token.
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * 
 */
module.exports = (postgresClient) => {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const jwt = require('jsonwebtoken');
    const Model = require('../models');

    const MagicWord = process.env.MAGIC_WORD;
    const ClientCredentialModel = Model(postgresClient).ClientCredentialModel;

    /**
     * 
     * Verify if the Email Address of the User is Registered as a Permanent Account in the Client Credentials
     * Database, hosted on RDS on AWS.
     * 
     * @param {string} userEmail Email of the Client whose account is being verified as permanent
     * @returns boolean. true, if email address is associated with a permanent account, or false
     * if it is not a permanent account.
     * 
     */
    const verifyPermanentAccount = async userEmail => {
        const userEmailSalted = userEmail + "" + MagicWord;
        const userId = crypto.createHash('sha256').update(userEmailSalted).digest('base64');

        const userPermanent = await ClientCredentialModel.findAll({ where: { client_id: userId } });
        return userPermanent.length !== 0;
    };

    /**
     * 
     * Verify the Token Provided as Permanent, and then Decode the Token and return the Payload
     * 
     * @param {jwt} token Permanent Token, which needs to be decoded
     * @returns object. If Token is verified as authentic and bearer is genuine, it returns the payload
     * of the Token. If A Transient Token is passed, it returns false. If the token is malformed, tampered
     * or being used in wrong way, it return the proper error according to the way the token is being 
     * passed and how it's being used.
     * 
     */
    const decodePermanentToken = token => {
        const publicKeyPath = path.join(__dirname, "../private/twilight_ecc_public_key.pem")
        const twilightPublicKey = fs.readFileSync(publicKeyPath);
        
        try {
            const payload = jwt.verify(token, twilightPublicKey, {
                algorithm: 'ES512',
                issuer: 'Bliss LLC.'
            });

            console.log(payload);

            if(payload.TOKEN_AUTHORIZATION === 'PERMANENT') {
                return payload;
            }
            else {
                return false;
            }
        }
        catch(err) {
            console.log(err);
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

    /**
     * 
     * Generate a New Permanent Token for a New User Registered
     * 
     * @param {json} payload Generate a New Permanent Token, for a fresh user, registered in the database
     * @returns jwt, Permanent Token for the user who passed the payload.
     * 
     */
    const generatePermanentToken = (payload) => {
        const privateKeyPath = path.join(__dirname, "../private/twilight_ecc_private_key.pem")
        const twilightPrivateKey = fs.readFileSync(privateKeyPath);
        
        const token = jwt.sign(payload, twilightPrivateKey, {
                    algorithm: 'ES512',
                    expiresIn: "1d",
                    notBefore: new Date().getTime(),
                    issuer: 'Bliss LLC.',
                    mutatePayload: true
                });
    
        return token;
    };

    /**
     * 
     * Rotate the Old Token.
     * 
     * @param {jwt} token Old Token, which is to be generated
     * 
     */
    const rotatePermanentToken = token => {
        //Handle Permanent Token Rotation
    };

    return {
        verifyPermanentAccount,
        decodePermanentToken,
        generatePermanentToken
    };
}