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

 //Importing Modules
require('dotenv').config();

const express = require('express');
const passport = require('passport');
const chalk = require('./chalk.console');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/routes');
const redisConnection = require('./connections/RedisConnection');
const strategiesConstructor = require('./strategies/Strategies');
const postgresConnection = require('./connections/PostgresConnection');


//Initializing Variables
const app = express();
const PORT = process.env.PORT || 4000;
const env = process.env.NODE_ENV;

//Confirming Developement Environment
if(env === 'development') {
    console.log(chalk.info('##### SERVER IS RUNNING IN DEVELOPMENT MODE ######'));
} else if(env === 'production') {
    console.log(chalk.info('##### SERVER IS RUNNING IN PRODUCTION MODE ######'));
} else {
    console.error(chalk.error('No NODE_ENV is provided'));
    process.exit(1);
}

//Initializing Databases Connection
const redisClient = redisConnection(env);
const postgresClient = postgresConnection(env);

//Initializing Strategies
const strategies = strategiesConstructor();

//Invoking Middlewares in the Routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());
app.use(passport.session());


passport.use('basic-auth-transient', strategies.transientTokenStrategy(postgresClient, redisClient));
passport.use('google-oauth-transient', strategies.googleTransientOAuthStrategy(postgresClient, redisClient));
passport.use('facebook-oauth-transient', strategies.facebookTransientOAuthStrategy(redisClient));
passport.use('auth-permanent', strategies.permanentTokenStrategy(postgresClient, redisClient));


//Databases Connection and Routes Initialization
postgresClient.authenticate()
    .then(() => console.log(chalk.success(`Postgres Database Connected Successfully`)))
    .catch(() => console.error(chalk.error(`Postgres Database Connection Failed`)));

redisClient.on('connect', () => console.log(chalk.success(`Redis Connected Successfully!`)));

redisClient.on('ready', () => {
    console.log(chalk.success(`Redis is Ready!`));
    app.use('/clients', authRoutes(postgresClient, redisClient));
    app.get('/ping',(req, res) => res.send('OK'));
});

redisClient.on('error', (err) => console.error(chalk.error(`Error Connecting Redis Server! ${err}`)));

app.listen(PORT, () => console.log(chalk.info(`Server Listening on Port ${PORT}`)));