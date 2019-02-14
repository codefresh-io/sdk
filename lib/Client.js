const Swagger = require('swagger-client');
const _ = require('lodash');
const CFError = require('cf-errors');
const debug = require('debug')('codefresh:sdk:client');
const defaults = require('./defaults');

const { postProcessApi } = require('../helpers/api');
const { loadOpenApiSpec } = require('../helpers/cache');
const { Http } = require('../helpers/http');
const { testJwt } = require('../helpers/jwt');

class Client {
    constructor(config) {
        this.config = config;
        this.api = null;
    }

    async resolve(path, args) {
        await this.loadClient();
        debug(`sdk path: ${path}`);
        debug('args: %o', args);

        const handler = _.get(this.api, path);
        if (!handler) {
            debug(`no handler for path: ${path}`);
            throw new CFError(`SDK has no handler for path: '${path}'. Please check the openapi.json used for sdk`);
        }

        return handler(...this.resolveArgs(path, args, handler.spec || {}));
    }

    async loadClient() {
        if (!this.api) {
            let { spec } = this.config;
            const {
                specUrl, apiKey, url,
                cache: {
                    disable: disableCache,
                    forceRefresh,
                } = {},
            } = this.config;

            const isJwt = testJwt(apiKey);
            const http = Http(this.config, isJwt);

            const swaggerConfig = {
                http,
                authorizations: isJwt ? undefined : { internalApiKey: apiKey },
            };

            if (!spec) {
                const specOptions = { forceRefresh, disableCache, specUrl };
                debug('loading spec: %o', specOptions);
                spec = await loadOpenApiSpec(specOptions);
            }
            swaggerConfig.spec = _.cloneDeep(spec);

            const swagger = await Swagger(swaggerConfig);
            if (url && swagger.spec) {
                const serverUrl = url.endsWith('/api') ? url : `${url}/api`;
                debug('using provided server url: ', serverUrl);
                swagger.spec.servers = [{ url: serverUrl }];
            }
            if (swagger.spec && _.isEmpty(swagger.spec.servers)) {
                const defaultUrl = `${defaults.URL}/api`;
                debug('using default server url: ', defaultUrl);
                swagger.spec.servers = [{ url: defaultUrl }];
            }

            this.api = postProcessApi(swagger, spec);
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
