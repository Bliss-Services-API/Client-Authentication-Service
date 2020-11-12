'use strict';

/**
 * 
 * Strategy for Handling the Permanent Signup Process for the fresh clients, and return
 * the Permanent Token, which will be used to Access Other Services and the APIs of the
 * Bliss App. It doesn't Authorizes for Admin APIs.
 * 
 * @param {Sequelize Object} postgresClient Sequelize Object storing connection for Postgres Server
 * @param {Redis Object} redisClient Client to use for Redis Database Operations
 * 
 */
module.exports = (postgresClient, redisClient) => {
    
    //Importing Modules
    const Controller = require('../controller');
    const Models = require('../models');
    const Strategy = require('passport-http-bearer');

    //Initializing Variables
    const BearerStrategy = Strategy.Strategy;
    const ClientCredentialModel = Models(postgresClient).ClientCredentialModel;
    const PermanentTokenController = Controller(postgresClient, redisClient).PermanentTokenController;
    const TransientTokenController = Controller(postgresClient, redisClient).TransientTokenController;

     /**
     * 
     * Checks if a req header's Authorization: Bearer <TOKEN> is a Transient Token. If not, it'll
     * return an error message. Otherwise, it'll generate Permanent token and send it back to the
     * client, along with session creation in the database, and authorizing the client for login
     * in the app
     * 
     */
    return new BearerStrategy(async (token, done) => {
        try {
            //If Token is provided in the req.headed Authorization: Bearer
            if(token) {
                //Decode the Token, and Check if the Token is Transient

                const payload = TransientTokenController.decodeTransientToken(token);
                if(!payload) {
                    //Token was not Transient
                    return done(null, 'No Transient Token Found');
                }
                else if(payload && !payload.ERR) {
                    //Token Payload is handled here. get clientId from payload, and
                    //use the clientId to fetch all the details from the database
                    //of the client

                    const clientId = payload.CLIENT_ID;
                    const currTime = new Date().getTime();

                    const clientRegistered = await ClientCredentialModel.findAll({
                        where: {
                            client_id: clientId
                        }
                    });

                    //If Client has Completed the Signup Process
                    if(clientRegistered.length !== 0) {
                        const client = clientRegistered[0]['dataValues'];

                        //Create Permanent Token Payload
                        const permanentTokenPayload = {
                            CLIENT_EMAIL: client['client_email'],
                            CLIENT_ID: payload.CLIENT_ID,
                            TOKEN_AUTHORIZATION: 'PERMANENT',
                            REVOKE_TIME: currTime
                        };

                        //Generate Permanent Token
                        const permanentToken = PermanentTokenController.generatePermanentToken(permanentTokenPayload);

                        //Return the Token to the Client
                        return done(null, {
                            Message: 'DONE',
                            Response: 'Registered as Permanent Account',
                            TokenStatus: 'PERMANENT',
                            Token: permanentToken,
                            Expires: currTime + (1000 * 60 * 60 * 24),
                            RevokeTime: currTime
                        });
                    } else {
                        //User has not Completed the Profile yet. So They can't get the Permanent Token
                        return done(null, 'User has Not Completed the Profile and/or Registerd Successfully');
                    }
                } else {
                    //If Payload contains the Error, Send the Error Back to the Client
                    return done(null, payload);
                }
            } else {
                //If no token is provided
                return done(null, false)
            }
        } 
        catch(err) {
            //If any Error Occured, Send the Error Back to the Client as the Server Error
            return done(err);
        };
    });
}