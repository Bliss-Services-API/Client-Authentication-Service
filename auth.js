'use strict';

/**
 * 
 * **Server Entrypoiny**
 * 
 * Authentication Service will Handle all of the Authentication Queries for the Client in
 * the Bliss app. It includes Generating Transient JWT Token, which are only used
 * for Completing the Registration and Creating the Profile of Clients, and the Generation 
 * of Permanent JWT Tokens, which Authorizes Clients Throughout the Bliss App.
 * 
 * Both the types of Token can be generated using Basic Auth, Google OAuth, and Facebook 
 * OAuth strategies.
 * 
 */

require('dotenv').config();

const AWS = require('aws-sdk');
const express = require('express');
const bodyParser = require('body-parser');
const signUpRoutes = require('./routes/routes');
const passport = require('passport');
const morgan = require('morgan');
const postgresConnection = require('./connections/PostgresConnection');
const strategiesConstructor = require('./strategies/Strategies');


const app = express();
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV;

if(ENV === 'development') console.log('##### SERVER IS RUNNING IN DEVELOPMENT MODE ######');
else if(ENV === 'production') console.log('##### SERVER IS RUNNING IN PRODUCTION MODE ######');
else {
    console.error('No NODE_ENV is provided');
    process.exit(1);
}

const postgresClient = postgresConnection(ENV);

AWS.config.getCredentials((err) => {
    if(err) {
        console.error(`CREDENTIALS NOT LOADED`);
        process.exit(1);
    }
    else console.log(`##### AWS ACCESS KEY IS VALID #####`);
});

AWS.config.update({region: 'us-east-2'});

const strategies = strategiesConstructor();
const S3Client = new AWS.S3({apiVersion: '2006-03-01'});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(morgan('dev'));
app.use(passport.initialize());
app.use(passport.session());

passport.use('google-signup', strategies.facebookSignupStrategy(postgresClient, S3Client));
passport.use('facebook-signup', strategies.facebookSignupStrategy(postgresClient, S3Client));

postgresClient.authenticate()
    .then(() => console.log(`Postgres Database Connected Successfully`))
    .then(() => app.use('/client', signUpRoutes(postgresClient, S3Client)))
    .then(() => app.get('/ping', (req, res) => res.send('OK')))
    .then(() => console.log('Routes Established Successfully'))
    .catch((err) => console.error(`Postgres Database Connection Failed! ${err}`));

app.listen(PORT, () => console.log(`Server Listening on Port ${PORT}`));