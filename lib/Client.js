const _ = require('lodash');

const { postProcessApi } = require('../helpers/api');

class Client {
    constructor(sdk) {
        this.sdk = sdk;
        this.config = sdk.config;
        this.api = null;
        this._loadClient();
    }

    _loadClient() {
        if (!this.api) {
            const {
                swagger,
                options: { spec = {} } = {},
            } = this.config;

            this.api = postProcessApi(swagger, spec.json);
            _.assign(this.sdk, _.defaultsDeep(this.sdk, this.api));
        }
    }
}

module.exports = Client;
