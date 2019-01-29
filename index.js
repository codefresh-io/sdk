const Sdk = require('./lib/Sdk');

function Codefresh(config) {
    return new Sdk(config).proxy();
}

module.exports = Codefresh;


