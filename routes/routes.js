'use strict';

/**
 * 
 * Routes for Accessing Client-Authentication-Services offered by the Blis App.
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * 
 */
module.exports = (postgresClient, S3Client) => {
    
    //Importing Modules
    const passport = require('passport');
    const express = require('express');
    const Controller = require('../controller');
    const multer = require('multer');
    const fs = require('fs');

    //Initializing Variables
    const router = express.Router();

    const clientImageMultipart = multer({dest: `tmp/client_images`});
    const clientTokenController = Controller(postgresClient, S3Client).clientSignupController;


    /**
     * 
     * Route for GET Transient JWT Token.
     * 
     */
    router.post('/signup', clientImageMultipart.single('client_image'),
        async (req, res) => {
            try {
                const clientEmail = req.body.email;

                if(!clientEmail) 
                    return res.send({
                        ERR: `No Email Provided`,
                        CODE: 'NO_EMAIL_FOUND'
                    });

                const currTime = new Date().getTime();
                const clientEmailSalted = clientEmail + "" + MagicWord;
                const clientId = crypto.createHash('sha256').update(clientEmailSalted).digest('base64');
                
                const userPermanent = await clientTokenController.clientAccountExists(clientId);

                if(userPermanent)
                    return res.send({
                        ERR: `${clientEmail} is already registered`,
                        CODE: 'ALREADY_REGISTERED'
                    });

                const clientCategory = req.body.client_category;
                const clientDOB = req.body.client_category;
                const clientContactNumber = req.body.client_category;
                const clientOriginCountry = req.body.client_category;
                const clientBio = req.body.client_category;

                const clientImageFilePath = fs.createReadStream(req.file.path);
                const clientImageFileName = clientEmail + `.png`;
                const clientImageMIMEType = req.file.mimetype;

                const imageExists = await clientTokenController.checkClientImageExist(clientImageFileName);
                const profileExists = await clientTokenController.checkClientProfileExists(clientId);

                if(!imageExists && !profileExists) {
                    await clientTokenController.uploadClientImage(clientImageFilePath, clientImageFileName, clientImageMIMEType);
                    await clientTokenController.uploadClientProfileData(clientId, clientCategory, clientDOB, clientContactNumber, clientOriginCountry, clientBio);
                    await clientTokenController.uploadClientCredentials(clientId, clientEmail, clientName, clientPassword);

                    const tokenPayload = {
                        CLIENT_ID: clientId,
                        REVOKE_TIME: currTime
                    };

                    const token = clientTokenController.generateToken(tokenPayload);

                    return done(null, {
                        MESSAGE: 'DONE',
                        RESPONSE: `Registered Successfully`,
                        TOKEN: token
                    });
                }
                else if(imageExists) throw new Error('Client Profile Image Already Exists');
                else throw new Error('Client Already Registered Exists');
            }
            catch(err) {
                console.error(`ERR: ${err.message}`);
                return done(err);
            }
        }
    );

        /**
     * 
     * Google OAuth SignUp Route to GET Transient Token, and store access token and refresh token 
     * along with the users' credentials
     * 
     */
    router.get('/google-oauth', 
        passport.authenticate('google-oauth-transient', { scope: ['https://www.googleapisClient.com/auth/userinfo.profile', 
                                                                  'https://www.googleapisClient.com/auth/userinfo.email']}
    ));

    /**
     * 
     * Google OAuth SignUp Success Callback Route
     * 
     */
    router.get('/google-oauth/callback', (req, res) => {
        passport.authenticate('google-oauth-transient', (err, user, info) => {
            if(err) {
                console.log(chalk.error(JSON.stringify(err)));
                res.send(err);
            } else if(user) {
                console.log(chalk.success(JSON.stringify(user)));
                res.json(user);
            } else {
                console.log(chalk.info(JSON.stringify(info)));
                res.json(info);
            }
        })(req, res)
    });

    /**
     * 
     * Facebook OAuth SignUp Route to GET Transient Token, and store access token and refresh token 
     * along with the users' credentials 
     * 
     */
    router.get('/facebook-oauth', 
        passport.authenticate('facebook-oauth-transient', {scope: ['emails', 'read_stream']}
    ));

    /**
     * 
     * Facebook OAuth SignUp Success Callback Route
     * 
     */
    router.get('/facebook-oauth/callback', (req, res) => {
        passport.authenticate('facebook-oauth-transient', (err, user, info) => {
            if(err) {
                console.log(chalk.error(JSON.stringify(err)));
                res.send(err);
            } else if(user) {
                console.log(chalk.success(JSON.stringify(user)));
                res.send(user);
            } else {
                console.log(chalk.info(JSON.stringify(info)));
                res.send(info);
            }
        })(req, res)
    });

    return router;
}