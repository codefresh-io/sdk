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
 * A singelton that is in charge of providing an easy interface to the authentication configuration file on the file system
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
        context.current = 'true'; // eslint-disable-line
    }

    useContext(name) {
        const context = this.getContextByName(name);
        if (!context) {
            throw new CFError(`No such context: '${name}'`);
        }
        this.currentContextName = name;
        context.current = 'true'; // eslint-disable-line
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
    }

    _setConfigFilePath(configFilePath) {
        this.configFilePath = configFilePath;
    }

    _getConfigFilePath() {
        return this.configFilePath;
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

    /**
     * Loads the passed config file.
     * This function is blocking because is it being used during the entry point of the CLI
     * @param configFilePath
     * @returns {{contexts: Array, "current-context": string}}
     */
    async loadConfig(configFilePath = defaults.CF_CONFIG_PATH) {
        if (configFilePath === this._getConfigFilePath()) {
            return;
        }
        this._setConfigFilePath(configFilePath);

        try {
            const doc = yaml.safeLoad(await readFile(configFilePath, 'utf8'));
            _.forEach(doc.contexts, (rawContext) => {
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
            });

            const currentContext = this.getContextByName(doc['current-context']);
            if (currentContext) {
                this.setCurrentContext(currentContext);
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
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
     * @return boolean - defines whether context was created or not (UPDATED)
     * */
    async createContext(apiKey, url, name) {
        const context = await createContext(apiKey, url, name);
        this.addContext(context);

        // createContext(); // todo : notify created

        return context;
    }

    /**
     * stores all current contexts back to config file
     */
    async persistConfig() {
        const newContextFile = {
            contexts: {},
            'current-context': this.currentContextName,
        };

        _.forEach(this.contexts, (context) => {
            newContextFile.contexts[context.name] = context.serialize();
        });

        await writeFile(this._getConfigFilePath(), yaml.safeDump(newContextFile), 'utf8');
    }
}

module.exports = new Manager();
