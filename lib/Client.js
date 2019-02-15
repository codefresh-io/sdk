const _ = require('lodash');
const CFError = require('cf-errors');
const debug = require('debug')('codefresh:sdk:client');

const { postProcessApi } = require('../helpers/api');

class Client {
    constructor(config) {
        this.config = config;
        this.api = null;
    }

    resolve(path, args) {
        this.loadClient();
        debug(`client path: ${path}`);
        debug('args: %o', args);

        const handler = _.get(this.api, path);
        if (!handler) {
            debug(`no handler for path: ${path}`);
            throw new CFError(`SDK has no handler for path: '${path}'. Please check the openapi.json used for sdk`);
        }

        return handler(...this.resolveArgs(path, args, handler.spec || {}));
    }

    loadClient() {
        if (!this.api) {
            const {
                context,
                swagger,
                options: { spec = {} } = {},
            } = this.config;

            if (!context || !swagger || !spec.json) {
                throw new CFError('Sdk is not configured');
            }

            this.api = postProcessApi(swagger, spec.json);
            debug('client loaded!');
        }
    }


    resolveArgs(path, args, spec) {
        let [params, requestBody] = args; // eslint-disable-line prefer-const
        if (!params) {
            if (!requestBody) {
                return args;
            }
            return [{}, { requestBody }];
        }

        // params and request body
        if (requestBody) {
            return [params, { requestBody }];
        }

        // requestBody inside params
        if (params.requestBody) {
            requestBody = params.requestBody; // eslint-disable-line prefer-destructuring
            delete params.requestBody;
            return [params, { requestBody }];
        }

        // if only params passed and method has request body, params is the request body
        if (spec.requestBody) {
            return [params, { requestBody: params }];
        }
        return [params];
    }
}

module.exports = Client;
