/**
 * 
 * Index of All Strategies Available in the Authentication Service
 * 
 */
module.exports = () => {
    const transientTokenStrategy = require('./TransientTokenStrategy');
    const facebookTransientOAuthStrategy = require('./FacebookTransientOAuthStrategy');
    const googleTransientOAuthStrategy = require('./GoogleTransientOAuthStrategy');
    const permanentTokenStrategy = require('./PermanentTokenStrategy');

    return {
        transientTokenStrategy,
        facebookTransientOAuthStrategy,
        googleTransientOAuthStrategy,
        permanentTokenStrategy
    }
};