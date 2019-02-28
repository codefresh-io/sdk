const debug = require('debug')('codefresh:sdk');
const CFError = require('cf-errors');
const Client = require('./Client');
const Logic = require('./LogicManager');
const Config = require('./Config');

class Sdk {
    constructor(config) {
        if (config) this.configure(config);
    }

    configure(config) {
        if (!(config instanceof Config)) {
            const message = 'Config must be instance of Config - please use Config.load()';
            debug(message);
            throw new CFError(message);
        }
        this.config = config;
        this.logic = new Logic(this);
        this.client = new Client(this);
    }

    http(options) {
        if (!this.config || !this.config.http) {
            throw new CFError('Could not execute request - sdk is not configured');
        }
        return this.config.http(options);
    }
}

module.exports = Sdk;
