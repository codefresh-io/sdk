const _ = require('lodash');
const Context = require('./Context');

const TYPE = 'NoAuthContext';

class NoAuthContext extends Context {
    constructor(options) {
        super(options);
        this.type = TYPE;
        this.token = 'no-token';
        this.name = 'no-auth';
        this.isNoAuth = true;
        this.defaultColumns = ['current', 'name', 'url', 'account', 'status'];
    }

    prepareHttpOptions() {
        return {};
    }

    async validate() {
    }

    toString() {
        return `name: ${this.name}, url: ${this.url}`;
    }

    serialize() {
        const data = {
            token: this.token,
            beta: this.beta,
            onPrem: this.onPrem,
        };

        return _.assignIn(super.serialize(), data);
    }

    static createFromSerialized(rawContext) {
        return new NoAuthContext({
            name: rawContext.name,
            url: rawContext.url,
            token: rawContext.token,
            beta: rawContext.beta,
            onPrem: rawContext.onPrem,
        });
    }
}

NoAuthContext.TYPE = TYPE;

module.exports = NoAuthContext;
