const CFError = require('cf-errors');
const Client = require('./Client');
const Logic = require('./Logic');

class Sdk {
    constructor(config) {
        if (config) this.configure(config);
    }

    configure(config) {
        this.config = config;
        this.logic = new Logic(this);
        this.client = new Client(this);
    }

    async reloadConfig() {
        if (!this.config) {
            throw new CFError('Could not reload - sdk is not configured');
        }
        this.configure(await this.config.recreate());
    }

    http(options) {
        if (!this.config || !this.config.http) {
            throw new CFError('Could not execute request - sdk is not configured');
        }
        return this.config.http(options);
    }
}

module.exports = Sdk;
