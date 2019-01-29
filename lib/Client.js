const Swagger = require('swagger-client');
const _ = require('lodash');
const CFError = require('cf-errors');
const request = require('requestretry');
const debug = require('debug')('codefresh:sdk:client');

const DEFAULT_CODEFRESH_URL = 'https://g.codefresh.io';
const DEFAULT_SPEC_URL = `${DEFAULT_CODEFRESH_URL}/api/swagger.json`;
const RETRY_STATUS_CODES = [502, 503, 504];
const RETRY_STRATEGY = (err, response) => {
    return process.env.DEBUG !== 'codefresh' && (request.RetryStrategies.NetworkError(err) || RETRY_STATUS_CODES.includes(response.statusCode));
};

function _makeResponseError(response) {
    return new CFError({
        statusCode: response.statusCode,
        message: JSON.stringify(response.body || response)
    });
}

/**
 * remove numbers at the end of operationId at every api resource
 * */
function _processApi(swagger) {
    return _.mapValues(swagger.apis, (resource) => {
        const metKeys = new Set();
        _.keys(resource).forEach((key) => {
            const prop = resource[key];
            const noNumberKey = key.replace(/\d+$/, '');
            if (noNumberKey !== key && !metKeys.has(noNumberKey)) {
                delete resource[key];
                resource[noNumberKey] = prop;
                metKeys.add(noNumberKey);
            }
        });
        return resource;
    });
}

class Client {
    constructor(config) {
        this.validateConfig(config);
        this.config = config;
        this.api = null;
    }

    async resolve(path, args) {
        await this.loadClient();
        debug(`resolve: path: ${path} -- args: ${args}`, path, args);
        const handler = _.get(this.api, path);
        if (!handler) {
            throw new CFError(`No handler for path: ${path}`);
        }

        const response = await handler(...this.resolveArgs(path, args));

        try {
            response.body = JSON.parse(response.body); // json option at config does not work
        } catch (e) {
        }

        this.handleErrors(response);
        return response.body;
    }

    async loadClient() {
        if (!this.api) {
            const {spec, specUrl, apiKey, url} = this.config;
            const swaggerConfig = {
                http: request.defaults({
                    maxAttempts: (this.config.request && this.config.request.maxRetries) || 5,
                    retryDelay: (this.config.request && this.config.request.retryDelay) || 1000,
                    retryStrategy: RETRY_STRATEGY
                }),
                authorizations: {
                    internalApiKey: apiKey
                }
            };

            if (spec) {
                swaggerConfig.spec = spec;
            } else {
                swaggerConfig.url = specUrl || DEFAULT_SPEC_URL
            }

            const swagger = await Swagger(swaggerConfig);
            if (url) {
                swagger.spec.servers = [{url: url.endsWith('/api') ? url : `${url}/api`}];
            }

            this.api = _processApi(swagger);
            debug('client loaded!')
        }
    }

    validateConfig(config) {
        const {apiKey} = config;
        if (!apiKey) {
            throw new CFError('Api-key must be provided!');
        }
    }

    handleErrors(response) {
        const {statusCode} = response;

        // if for some reason request was not properly redirected (when "Location" header is lost, not usual case)
        if (statusCode >= 300 && statusCode < 400) {
            throw new CFError({
                cause: _makeResponseError(response),
                message: 'Error: Request was not properly redirected',
            });
        }
        if (statusCode === 401) {
            throw new CFError({
                cause: _makeResponseError(response),
                message: 'Error: Please create or update your authentication context',
            })
        }
        if (statusCode === 403) {
            throw new CFError({
                cause: _makeResponseError(response),
                message: 'Error: You do not have permissions to perform this action',
            });
        }

        // other status codes
        if (statusCode >= 400 && statusCode < 600) {
            if (_.get(response, 'body.message')) {
                if (_.get(response, 'body.error')) {
                    throw new CFError(`message: ${response.body.message}\nerror: ${response.body.error}`);
                } else {
                    throw new CFError(response.body.message);
                }
            } else {
                throw _makeResponseError(response);
            }
        }
    }

    resolveArgs(path, args) {
        let [params, requestBody] = args;
        if (!params) {
            if (!requestBody) {
                return args;
            }
            return [{}, {requestBody}]
        }

        // params and request body
        if (requestBody) {
            return [params, {requestBody}];
        }

        // requestBody inside params
        if (params.requestBody) {
            requestBody = params.requestBody;
            delete params.requestBody;
            return [params, {requestBody}]
        }

        // if only params passed, it may be request body
        // passing both will be resolved properly by swagger client
        return [params, {requestBody: params}]
    }
}

module.exports = Client;
