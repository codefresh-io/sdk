const debug = require('debug')('codefresh:sdk:config:manager');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const CFError = require('cf-errors');
const yaml = require('js-yaml');
const Promise = require('bluebird');

const defaults = require('../defaults');
const { createContext } = require('../../helpers/context');

const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const mkdir = Promise.promisify(fs.mkdir);

// context classes
const { JWTContext, APIKeyContext } = require('./contexts');

/**
 * A singleton that is in charge of providing an easy interface to the authentication configuration file on the file system
 */
class Manager {
    constructor() {
        this.contexts = {};
        this.currentContextName = null;
    }

    /**
     * retrieves a context by name otherwise returns undefined
     * @param name - the identifier of the context
     * @returns {*}
     */
    getContextByName(name) {
        return _.get(this.contexts, name, undefined);
    }

    /**
     * sets the current active context
     * @param context
     */
    setCurrentContext(context) {
        if (this.getContextByName(context.name)) {
            this.currentContextName = context.name;
        } else {
            this.addContext(context);
            this.currentContextName = context.name;
        }
        debug('current context has been set:', context.name);
        context.current = 'true'; // eslint-disable-line
    }

    useContext(name) {
        const context = this.getContextByName(name);
        if (!context) {
            const message = `No such context: '${name}'`;
            debug(message);
            throw new CFError(message);
        }
        this.currentContextName = name;
        context.current = 'true'; // eslint-disable-line
        debug('using context:', name);
        return context;
    }

    /**
     * returns the current active context
     * @returns {*}
     */
    getCurrentContext() {
        return _.get(this.contexts, this.currentContextName, undefined);
    }

    addContext(context) {
        this.contexts[context.name] = context;
        debug('context added:', context.name);
    }

    /**
     * retrieves all contexts
     * @returns {{}}
     */
    getAllContexts() {
        return this.contexts;
    }

    isConfigLoaded() {
        return !!this.currentContextName;
    }

    hasContexts() {
        return !_.isEmpty(this.contexts);
    }


    async loadConfig(configFilePath = defaults.CF_CONFIG_PATH) {
        debug('loading config:', configFilePath);
        if (configFilePath === this._getConfigFilePath()) {
            debug('config already loaded - using cache');
            return;
        }
        this._setConfigFilePath(configFilePath);

        try {
            const data = await readFile(configFilePath, 'utf8');
            const doc = yaml.safeLoad(data);
            _.forEach(doc.contexts, this._parseContext.bind(this));

            const currentContext = this.getContextByName(doc['current-context']);
            debug(`current context: '${doc['current-context']}'`);
            if (currentContext) {
                this.setCurrentContext(currentContext);
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                debug('config file does not exist - creating');
                const data = {
                    contexts: {},
                    'current-context': '',
                };
                await mkdir(path.dirname(configFilePath), { recursive: true });
                await writeFile(configFilePath, yaml.safeDump(data), 'utf8');
            } else {
                throw new CFError({
                    cause: err,
                    message: `Failed to load configuration file from path: ${configFilePath}`,
                });
            }
        }
    }

    /**
     * Loads the passed config file.
     * This function is blocking because is it being used during the entry point of the CLI
     */
    loadConfigSync(configFilePath = defaults.CF_CONFIG_PATH) {
        debug('loading config (sync):', configFilePath);
        if (configFilePath === this._getConfigFilePath()) {
            debug('config already loaded - using cache');
            return;
        }
        this._setConfigFilePath(configFilePath);

        try {
            const data = fs.readFileSync(configFilePath, 'utf8');
            const doc = yaml.safeLoad(data);
            _.forEach(doc.contexts, this._parseContext.bind(this));

            const currentContext = this.getContextByName(doc['current-context']);
            debug(`current context: '${doc['current-context']}'`);
            if (currentContext) {
                this.setCurrentContext(currentContext);
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                debug('config file does not exist - creating');
                const data = {
                    contexts: {},
                    'current-context': '',
                };
                fs.mkdirSync(path.dirname(configFilePath), { recursive: true });
                fs.writeFileSync(configFilePath, yaml.safeDump(data), 'utf8');
            } else {
                throw new CFError({
                    cause: err,
                    message: `Failed to load configuration file from path: ${configFilePath}`,
                });
            }
        }
    }

    /**
     * @return Object - created context
     * */
    async createContext(apiKey, url, name) {
        debug('creating context: %o', { name, apiKey: apiKey && `${apiKey.substring(0, 10)}...`, url });
        const context = await createContext(apiKey, url, name);
        this.addContext(context);
        return context;
    }

    /**
     * stores all current contexts back to config file
     */
    async persistConfig() {
        debug('persisting config:', this._getConfigFilePath());
        const newContextFile = {
            contexts: {},
            'current-context': this.currentContextName,
        };

        _.forEach(this.contexts, (context) => {
            newContextFile.contexts[context.name] = context.serialize();
        });

        await writeFile(this._getConfigFilePath(), yaml.safeDump(newContextFile), 'utf8');
    }

    _setConfigFilePath(configFilePath) {
        this.configFilePath = configFilePath;
    }

    _getConfigFilePath() {
        return this.configFilePath;
    }

    _parseContext(rawContext) {
        switch (rawContext.type) {
            case JWTContext.TYPE: {
                const context = JWTContext.createFromSerialized(rawContext);
                this.addContext(context);
                break;
            }
            case APIKeyContext.TYPE: {
                const context = APIKeyContext.createFromSerialized(rawContext);
                this.addContext(context);
                break;
            }
            default: {
                throw new CFError(`Failed to parse context of type: ${rawContext.type}`);
            }
        }
    }
}

module.exports = new Manager();
