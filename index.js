const Sdk = require('./lib/Sdk');
const Config = require('./lib/Config');

function Codefresh(config) {
    return new Sdk(config).proxy();
}

module.exports = {
    Codefresh,
    Config,
};
