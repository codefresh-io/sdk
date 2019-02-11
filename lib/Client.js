const Swagger = require('swagger-client');
const _ = require('lodash');
const CFError = require('cf-errors');
const request = require('requestretry');
const debug = require('debug')('codefresh:sdk:client');
const defaults = require('./defaults');

const { postProcessApi } = require('../helpers/api');
const { loadOpenApiSpec } = require('../helpers/cache');
const { handleErrors } = require('../helpers/error');

const RETRY_STATUS_CODES = [502, 503, 504];
const RETRY_STRATEGY = (err, response) => process.env.DEBUG !== 'codefresh' && (request.RetryStrategies.NetworkError(err) || RETRY_STATUS_CODES.includes(response.statusCode)); // eslint-disable-line max-len


class Client {
    constructor(config) {
        this.config = config;
        this.api = null;
    }

    async resolve(path, args) {
        await this.loadClient();
        debug(`resolve: path: ${path} -- args: ${args}`, path, args);
        const handler = _.get(this.api, path);
        if (!handler) {
            throw new CFError(`SDK has no handler for path: '${path}'. Please check the openapi.json used for sdk`);
        }

        const response = await handler(...this.resolveArgs(path, args, handler.spec || {}));

        try {
            response.body = JSON.parse(response.body); // json option at request config does not work properly
        } catch (e) {
            debug(`Could not parse response body: ${response.body}`);
        }

        handleErrors(response);
        return response.body;
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
                request: {
                    maxRetries,
                    retryDelay,
                } = {},
            } = this.config;

            const http = request.defaults({
                timeout: 30000,
                maxAttempts: maxRetries || defaults.MAX_RETRIES,
                retryDelay: retryDelay || defaults.RETRY_DELAY,
                retryStrategy: RETRY_STRATEGY,
            });

            const swaggerConfig = {
                http,
                authorizations: { internalApiKey: apiKey },
            };

            if (!spec) {
                debug(`loading spec: forceRefresh: ${forceRefresh} -- disableCache: ${disableCache} -- url: ${specUrl}`);
                spec = await loadOpenApiSpec({ specUrl, forceRefresh, disableCache });
            }
            swaggerConfig.spec = _.cloneDeep(spec);

            const swagger = await Swagger(swaggerConfig);
            if (url && swagger.spec) {
                swagger.spec.servers = [{ url: url.endsWith('/api') ? url : `${url}/api` }];
            }
            if (swagger.spec && _.isEmpty(swagger.spec.servers)) {
                swagger.spec.servers = [{ url: `${defaults.URL}/api` }];
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
            return [{}, { requestBody: params }];
        }
        return [params];
    }
}

module.exports = Client;
