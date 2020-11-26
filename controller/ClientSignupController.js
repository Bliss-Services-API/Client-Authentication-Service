'use strict';

/**
 * 
 * Controller for Handling Operations related to the Transient Token.
 * 
 * @param {Sequelize Object} postgresClient Client to use for Postgres Database Operations
 * 
 */
module.exports = (postgresClient, S3Client) => {
    
    //Importing Modules
    const fs = require('fs');
    const path = require('path');
    const jwt = require('jsonwebtoken');
    const model = require('../models');

    //Initializing Variables
    const Models = model(postgresClient);
    const clientCredentialModel = Models.ClientCredentialModel;
    const clientProfileModel = Models.ClientProfileModel;
    const clientImageBucket = process.env.CLIENT_IMAGE_BUCKET;

    /**
     * 
     * Generate a New Transient Token for a New User
     * 
     * @param {json} payload Generate a New Transient Token, for a user, requesting to register
     * as Permanent User
     * @returns jwt, Transient Token for the user who passed the payload.
     * 
     */
    const generateToken = (payload) => {
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
     * Verify if the Email Address of the User is Registered as a Transient Account
     * 
     * @param {string} userEmail Email of the Client whose account is being verified as permanent
     * @returns boolean. true, if email address is associated with a permanent account, or false
     * if it is not a permanent account.
     * 
     */
    const clientAccountExists = async userId => {
        const userPermanent = await clientCredentialModel.findAll({ where: { client_id: userId } });
        return userPermanent.length !== 0;
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

    /**
     * 
     * Function to upload celeb image in the S3
     * 
     * @param {stream} imageStream readStream of the image file, uploaded through the multer
     * @param {string} imageFileName Name of the Celeb Image File (.png)
     * @param {string} imageMIMEType MIME of the image upload
     * @returns {string} URL for downloading celeb image from the CDN (cached)
     * 
     */
    const uploadClientImage = async (imageStream, imageFileName, imageMIMEType) => {
        const imageParam = { 
            Bucket: clientImageBucket,
            Key: imageFileName,
            Body: imageStream,
            ContentType: imageMIMEType
        };

        const s3UploadPromise = S3Client.upload(imageParam).promise();

        return s3UploadPromise
        .then(() => {
            return true;
        });
    };

    const uploadClientProfileData = async (clientId, clientCategory, clientDOB, clientContactNumber, clientOriginCountry, clientBio) => {
        const currTime = new Date().getTime();
        const clientData = {};

        clientData['client_id'] = clientId;
        clientData['client_category'] = clientCategory;
        clientData['client_dob'] = clientDOB;
        clientData['client_contact_number'] = clientContactNumber;
        clientData['client_origin_country'] = clientOriginCountry;
        clientData['client_bio'] = clientBio;
        clientData['client_profile_image_link'] = `${clientId}.png`;
        clientData['client_joining_date'] = currTime;
        clientData['client_update_date'] = currTime;

        await clientProfileModel.create(clientData);
        return true;
    };
    
    const uploadClientCredentials = async (clientId, clientEmail, clientName, clientPassword) => {
        const clientCredentialData = {};

        clientCredentialData['client_id'] = clientId;
        clientCredentialData['client_email'] = clientEmail;
        clientCredentialData['client_name'] = clientName;
        clientCredentialData['client_password'] = clientPassword;

        await clientCredentialModel.create(clientCredentialData);
        return true;
    };

    /**
     * 
     * Function to Check Whether Celeb Image exists on the S3 Bucket
     * 
     * @param {string} imageFileName Name of the Celeb Image File (.png)
     * @returns {Promise} Resolve contains true (image exists), and reject contains error
     * or false (image doesn't exists)
     * 
     */
    const checkClientImageExist = async imageFileName => {
        const imageParam = {
            Bucket: clientImageBucket,
            Key: imageFileName
        };

        return new Promise((resolve, reject) => {
            try {
                S3Client.headObject(imageParam, (err, metadate) => {
                    if(err && err.statusCode === 404) {
                        return resolve(false);
                    } else if(err) {
                        return reject(err);
                    }else {
                        return resolve(true);
                    }
                });
            } catch(err) {
                return reject(err);
            };
        })
    };

    /**
     * 
     * Function to check whether celeb profile exists in the database
     * 
     * @param {string } celebName Name of the celeb, whose profile is being checked
     * @returns boolean true, if profile exists. false, if it doesn't
     * 
     */
    const checkClientProfileExists = async clientId => {
        const clientProfile = await clientProfileModel.findAll({ where: { client_id: clientId } });
        return (clientProfile.length !== 0);
    }

    return {
        generateToken,
        clientAccountExists,
        decodeTransientToken,
        uploadClientImage,
        uploadClientProfileData,
        uploadClientCredentials,
        checkClientImageExist,
        checkClientProfileExists
    };
}