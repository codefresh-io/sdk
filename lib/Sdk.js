const _ = require('lodash');

const Client = require('./Client');
const Logic = require('./logic');
const { resourceProxy } = require('../helpers/api');

class Sdk {
    constructor(config) {
        if (config) this.configure(config);
        this.resourcesCache = {};
    }

    resolve(prop) {
        if (prop === 'configure') {
            return this.configure.bind(this);
        }
        if (!this.config) {
            this.configure({});
        }
        if (prop === 'config') {
            return _.cloneDeep(this.config);
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
                if (typeof prop === 'symbol') {
                    return 'codefresh-sdk'; // for print at console.log(sdk)
                }
                return sdk.resolve(prop);
            },
            getOwnPropertyDescriptor(target, prop) {
                const a = Object.getOwnPropertyDescriptor(target, prop);
                if (a) a.value = this.get(target, prop);
                return a;
            },
        });
    }
}

module.exports = Sdk;
