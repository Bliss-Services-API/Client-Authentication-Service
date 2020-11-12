'use strict';

/**
 * 
 * Routes for Accessing Client-Authentication-Services offered by the Blis App.
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (postgresClient, redisClient) => {
    
    //Importing Modules
    const passport = require('passport');
    const express = require('express');
    const chalk = require('../chalk.console');
    const Controller = require('../controller');

    //Initializing Variables
    const router = express.Router();
    const TransientTokenController = Controller(postgresClient, redisClient).TransientTokenController;

    /**
     * 
     * Route for GET Transient JWT Token.
     * 
     */
    router.get('/auth/signup/transient', (req, res) => {
        passport.authenticate('basic-auth-transient', (err, user) => {
            if(!err) {
                // res.cookie('token', user.Token, {expires: user.Expire, signed: 'BlisClients LLC.'});
                res.send(user);
            } else {
                console.log(chalk.error(JSON.stringify(err)));
                res.status(401).send(err);
            }
        })(req, res);
    });

    /**
     * 
     * Route for Regenerating Transient Token for Transient Users
     * 
     */
    router.get('/auth/transient/regenerate', async (req, res) => {
       const userEmail = req.query.client_email;

       try {
           const response = await TransientTokenController.regenerateTransientToken(userEmail);
           console.log(chalk.success(response));
           res.send(response);
       }
       catch(err) {
           console.error(chalk.error(`ERR: ${err.message}`));
           res.send({
               ERR: err.message
            });
        }
    });

    /**
     * 
     * Google OAuth SignUp Route to GET Transient Token, and store access token and refresh token 
     * along with the users' credentials
     * 
     */
    router.get('/auth/google-oauth/signup', 
        passport.authenticate('google-oauth-transient', { scope: ['https://www.googleapisClient.com/auth/userinfo.profile', 
                                                                  'https://www.googleapisClient.com/auth/userinfo.email']}
    ));

    /**
     * 
     * Google OAuth SignUp Success Callback Route
     * 
     */
    router.get('/auth/google-oauth/signup/callback', (req, res) => {
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
    router.get('/auth/facebook-oauth/signup', 
        passport.authenticate('facebook-oauth-transient', {scope: ['emails', 'read_stream']}
    ));

    /**
     * 
     * Facebook OAuth SignUp Success Callback Route
     * 
     */
    router.get('/auth/facebook-oauth/signup/callback', (req, res) => {
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


    /**
     * 
     * Route for GET Transient JWT Token.
     * 
     */
    router.get('/auth/signup/permanent', (req, res) => {
        passport.authenticate('auth-permanent', (err, user, info) => {
            if(err) {
                res.send('Bad Token');
            }
            else if(user) {
                res.send(user);
            }
            else if(!user) {
                res.send({
                    ERR: 'No Token is Provided'
                })
            };
        })(req, res);
    })
 
    return router;
}