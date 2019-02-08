const _ = require('lodash');
const CFError = require('cf-errors');

const Client = require('./Client');
const Logic = require('./logic');
const { resourceProxy } = require('../helpers/api');

class Sdk {
    constructor(config = {}) {
        this.configure(config);
        this.resourcesCache = {};
    }

    resolve(prop) {
        if (prop === 'configure') {
            return this.configure.bind(this);
        }
        if (prop === 'config') {
            return _.cloneDeep(this.config);
        }
        if (!this.config) {
            throw new CFError('Sdk is not configured. Please call codefresh.configure() with proper config');
        }
        return this.resolveResource(prop);
    }

    configure(config) {
        this.config = config;
        this.client = new Client(config);
        this.logic = new Logic(this);
    }

    resolveResource(name) {
        let resource = this.resourcesCache[name];
        if (!resource) {
            resource = resourceProxy(this.client.resolve.bind(this.client), this.logic.resolve.bind(this.logic), name);
        }
        return resource;
    }

    proxy() {
        const sdk = this;
        return new Proxy({}, {
            get(target, prop) {
                return sdk.resolve(prop);
            },
        });
    }
}

module.exports = Sdk;
