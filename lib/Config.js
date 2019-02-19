const debug = require('debug')('codefresh:sdk:config');
const _ = require('lodash');
const CFError = require('cf-errors');
const Swagger = require('swagger-client');

const defaults = require('./defaults');
const { manager } = require('./auth');
const { Http } = require('../helpers/http');
const { createContext } = require('../helpers/context');
const { NoAuthContext } = require('./auth/contexts');

class Config {
    constructor({ context, swagger, options = {}, http }) {
        this.context = context;
        this.swagger = swagger;
        this.options = options;
        this.http = http;
        this._recreator = null;
    }

    static manager() {
        return manager;
    }

    manager() {
        return manager;
    }

    async recreate() {
        return this._recreator(this.options);
    }

    /**
     * @param {string} [options.context] - context to load (by default loads current)
     * @param {string} [options.configPath] - path to .cfconfig file (default: '$HOME/.cfconfig'
     *
     * @param {string} [options.url] - codefresh api url
     * @param {string} [options.spec.url] - url for retrieving openapi.json spec
     * @param {string/Object} [options.spec.json] - raw openapi.json spec
     * @param {Number} [options.request.timeout] - request timeout
     * @param {Number} [options.request.maxAttempts] - max request retries
     * @param {Number} [options.request.retryDelay] - request retry delay
     * @param {Function} [options.request.retryStrategy] - (err, res) => true/false - whether to retry or not
     * @param {Object} [options.request.headers] - headers for client
     * */
    static async fromFile(options = {}) {
        const {
            url,
            context: contextName,
            configPath = defaults.CF_CONFIG_PATH,
        } = options;

        debug('trying to load from file:', configPath);
        await manager.loadConfig(configPath);

        let context;
        if (contextName) {
            debug(`trying to retrieve context: '${contextName}'`);
            context = manager.getContextByName(contextName);
            if (!context) {
                const message = `No such context '${context}' at file ${configPath}`;
                debug(message);
                throw new CFError(message);
            }
        }

        if (!manager.hasContexts()) {
            debug('config file has no contexts - using NoAuthContext');
            const noAuthContext = new NoAuthContext({ url: url || defaults.URL });
            const config = await this._initializeConfig(noAuthContext, options);
            config._recreator = Config.fromFile.bind(Config);
            return config;
        }

        debug(`using current context: '${manager.currentContextName}'`);
        context = manager.getCurrentContext();
        if (!context) {
            const message = 'Failed to create context from file - no current context';
            debug(message);
            throw new CFError(message);
        }

        try {
            const config = await this._initializeConfig(context, options); // eslint-disable-line
            config._recreator = Config.fromFile.bind(Config);
            return config;
        } catch (e) {
            throw new CFError({
                message: 'Failed to create context from file',
                cause: e,
            });
        }
    }

    /**
     * @param {string} [options.apiKeyEnv] - name of the apiKey env var (default: 'CF_API_KEY')
     * @param {string} [options.urlEnv] - name of the url env var (default: 'CF_URL')
     *
     * @param {string} [options.url] - codefresh api url
     * @param {string} [options.spec.url] - url for retrieving openapi.json spec
     * @param {string/Object} [options.spec.json] - raw openapi.json spec
     * @param {Number} [options.request.timeout] - request timeout
     * @param {Number} [options.request.maxAttempts] - max request retries
     * @param {Number} [options.request.retryDelay] - request retry delay
     * @param {Function} [options.request.retryStrategy] - (err, res) => true/false - whether to retry or not
     * @param {Object} [options.request.headers] - headers for client
     * */
    static async fromEnv(options = {}) {
        debug('trying to load from env');
        const {
            apiKeyEnv = defaults.CF_TOKEN_ENV_VAR_NAME,
            urlEnv = defaults.CF_URL_ENV_VAR_NAME,
        } = options;

        debug('%o', { urlEnv, apiKeyEnv });

        const apiKey = process.env[apiKeyEnv];
        const url = process.env[urlEnv];

        if (!apiKey) {
            debug(`No apiKey at env var: '${apiKeyEnv}'`);
            throw new CFError(`Config: process.env.${apiKeyEnv} is not provided`);
        }

        debug('%o', { apiKey: `${apiKey && apiKey.substring(0, 10)}...`, url });
        try {
            const config = await this.fromProvided({ apiKey, url }); // eslint-disable-line
            config._recreator = Config.fromEnv.bind(Config);
            return config;
        } catch (e) {
            throw new CFError({
                message: 'Failed to create context from env',
                cause: e,
            });
        }
    }

    /**
     * @param {string} [options.url] - codefresh api url
     * @param {string} options.apiKey - codefresh api key
     *
     * @param {string} [options.spec.url] - url for retrieving openapi.json spec
     * @param {string/Object} [options.spec.json] - raw openapi.json spec
     * @param {Number} [options.request.timeout] - request timeout
     * @param {Number} [options.request.maxAttempts] - max request retries
     * @param {Number} [options.request.retryDelay] - request retry delay
     * @param {Function} [options.request.retryStrategy] - (err, res) => true/false - whether to retry or not
     * @param {Object} [options.request.headers] - headers for client
     * */
    static async fromProvided(options = {}) {
        debug('trying to load from provided');
        const {
            apiKey,
            url = defaults.URL,
        } = options;
        if (!apiKey) {
            const message = 'Config: apiKey is not provided';
            debug(message);
            throw new CFError(message);
        }
        if (!url) { // if null
            const message = 'Config: url is not provided';
            debug(message);
            throw new CFError(message);
        }

        try {
            const context = await createContext(apiKey, url);

            // todo : do not know if it's necessary to load config
            // await manager.loadConfig().catch(debug);

            const config = await this._initializeConfig(context, options); // eslint-disable-line
            config._recreator = Config.fromProvided.bind(Config);
            return config;
        } catch (e) {
            throw new CFError({
                message: 'Failed to create context from provided apiKey and url',
                cause: e,
            });
        }
    }

    /**
     * @param {string} [options.url] - codefresh api url
     * @param {string} [options.apiKey] - codefresh api key
     *
     * @param {string} [options.apiKeyEnv] - name of the apiKey env var (default: 'CF_API_KEY')
     * @param {string} [options.urlEnv] - name of the url env var (default: 'CF_URL')
     *
     * @param {string} [options.context] - context to load (by default loads current)
     * @param {string} [options.configPath] - path to .cfconfig file (default: '$HOME/.cfconfig'
     *
     * @param {string} [options.spec.url] - url for retrieving openapi.json spec
     * @param {string/Object} [options.spec.json] - raw openapi.json spec
     * @param {Number} [options.request.timeout] - request timeout
     * @param {Number} [options.request.maxAttempts] - max request retries
     * @param {Number} [options.request.retryDelay] - request retry delay
     * @param {Function} [options.request.retryStrategy] - (err, res) => true/false - whether to retry or not
     * @param {Object} [options.request.headers] - headers for client
     * */
    static async autoDetect(options = {}) {
        debug('auto detect config');
        try {
            return await this.fromProvided(options);
        } catch (e) {
            debug('not loaded fromProvided');
            try {
                return await this.fromEnv(options);
            } catch (e1) {
                debug('not loaded fromEnv');
                try {
                    return await this.fromFile(options);
                } catch (e2) {
                    debug('not loaded fromFile');
                    throw new CFError({
                        message: 'Could not auto detect config',
                        cause: e2,
                    });
                }
            }
        }
    }

    static async _initializeConfig(context, options = {}) {
        debug('_initializeConfig');
        if (!context) {
            const message = 'Context is not provided';
            debug(message);
            throw new CFError(message);
        }
        const {
            request = {},
            spec: {
                url: _specUrl,
                json,
                // todo: support versions and cache
                version, // eslint-disable-line
            } = {},
        } = options;

        request.baseUrl = context.url; // for non-swagger api calls [ usage: await sdk.http(options) ]
        const requestOptions = _.defaultsDeep(request, context.prepareHttpOptions());
        const http = Http(requestOptions);

        // todo: support versions and cache
        const specUrl = _specUrl || `${context.url}${defaults.SPEC_URL_SUFFIX}`;
        let spec = json;
        if (!spec) {
            debug('loading spec:', specUrl);
            spec = await http({ url: specUrl });
        }
        if (_.isString(spec)) {
            spec = JSON.parse(spec);
        }
        _.set(options, 'spec.json', spec);

        const swaggerConfig = { http, spec: _.cloneDeep(spec) };
        debug('creating swagger client...');
        const swagger = await Swagger(swaggerConfig);

        const url = `${context.url}/api`;
        swagger.spec.servers = [{ url }];
        debug('base url:', url);

        return new Config({ context, swagger, options, http });
    }
}

module.exports = Config;
