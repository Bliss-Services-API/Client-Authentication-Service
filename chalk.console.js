const chalk = require('chalk');

const error = chalk.redBright;
const success = chalk.greenBright;
const warning = chalk.hex('#ff3d00');
const info = chalk.yellowBright;

module.exports = {
    error,
    success,
    warning,
    info
};