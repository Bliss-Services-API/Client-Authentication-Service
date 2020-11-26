/**
 * 
 * Index of All Strategies Available in the Authentication Service
 * 
 */
module.exports = () => {
    const facebookSignupStrategy = require('./FacebookSignupStrategy');
    const googleSignupStrategy = require('./GoogleSignupStrategy');

    return {
        facebookSignupStrategy,
        googleSignupStrategy,
    }
};