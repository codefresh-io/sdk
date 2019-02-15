const debug = require('debug')('codefresh:sdk:config');
const _ = require('lodash');
const CFError = require('cf-errors');
const Swagger = require('swagger-client');

const defaults = require('./defaults');
const { manager } = require('./auth');
const { Http } = require('../helpers/http');
const { createContext } = require('../helpers/context');

class Config {
    constructor({ context, swagger, options = {} }) {
        this.context = context;
        this.swagger = swagger;
        this.options = options;
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
     * @param options.context - context to load (by default loads current)
     * @param options.configPath - path to .cfconfig file (default: '$HOME/.cfconfig'
     * */
    static async fromFile(options = {}) {
        const {
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
            debug('config file has no contexts - return empty config');
            const config = new Config({});
            config._recreator = Config.fromFile.bind(Config);
            return config;
        }
        context = manager.getCurrentContext();
        debug(`using current context: '${context.name}'`);

        const config = await this._initializeConfig(context, options); // eslint-disable-line
        config._recreator = Config.fromFile.bind(Config);
        return config;
    }

    /**
     * @param options.apiKeyEnv - name of the apiKey env var (default: 'CF_API_KEY')
     * @param options.urlEnv - name of the url env var (default: 'CF_URL')
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

        debug('%o', { apiKey: `${apiKey.substring(0, 10)}...`, url });
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

            await manager.loadConfig().catch(debug);

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

    static async _initializeConfig(context, options = {}) {
        debug('_initializeConfig');
        const {
            request = {},
            spec: {
                url: _specUrl,
                json,
                // todo: support versions and cache
                version, // eslint-disable-line
            } = {},
        } = options;

        const requestOptions = _.merge(request, context.prepareHttpOptions());
        const http = Http(requestOptions);


        const specUrl = _specUrl || `${context.url}${defaults.SPEC_URL_SUFFIX}`;
        let spec = json;
        // todo: support versions and cache
        if (!spec) {
            debug('loading spec:', specUrl);
            spec = await http({ url: specUrl });
        }
        if (_.isString(spec)) {
            spec = JSON.parse(spec);
        }
        _.set(options, 'spec.json', spec);

        const swaggerConfig = { http, spec: _.cloneDeep(spec) };
        debug('creating swagger client: %o', swaggerConfig);
        const swagger = await Swagger(swaggerConfig);

        const url = `${context.url}/api`;
        swagger.spec.servers = [{ url }];
        debug('base url:', url);

        return new Config({ context, swagger, options });
    }

    static async autoDetect(options = {}) {
        debug('auto detect config');
        try {
            return await this.fromProvided(options);
        } catch (e) {
            try {
                return await this.fromEnv(options);
            } catch (e1) {
                try {
                    return await this.fromFile(options);
                } catch (e2) {
                    throw new CFError({
                        message: 'Could not auto detect config',
                        cause: e2,
                    });
                }
            }
        }
    }
}

module.exports = Config;
