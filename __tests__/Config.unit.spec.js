const CFError = require('cf-errors');
const _ = require('lodash');
const Swagger = require('swagger-client');

const { Config } = require('../index');
const { createContext } = require('../helpers/context');
const { Http } = require('../helpers/http');

const { manager, contexts } = require('../lib/auth');
const defaults = require('../lib/defaults');

jest.mock('../helpers/context', () => { // eslint-disable-line
    return { createContext: jest.fn((token, url, name) => ({ token, url, name, prepareHttpOptions: () => ({}) })) };
});

jest.mock('swagger-client', () => jest.fn(options => options));

jest.mock('../helpers/http', () => {
    let response = { test: 'test' };
    const http = jest.fn(() => response);
    const httpConstructor = jest.fn(() => http);
    httpConstructor.__setResponse = (res) => {
        response = res;
    };
    httpConstructor.__getClient = () => http;
    return { Http: httpConstructor };
});

const originalInitializeConfig = Config._initializeConfig;
const originalFromProvided = Config.fromProvided;
const originalFromEnv = Config.fromEnv;
const originalFromFile = Config.fromFile;

describe('Config', () => {
    beforeEach(() => {
        Config._initializeConfig = originalInitializeConfig.bind(Config);
        Config.fromProvided = originalFromProvided.bind(Config);
        Config.fromEnv = originalFromEnv.bind(Config);
        Config.fromFile = originalFromFile.bind(Config);
    });

    describe('#fromProvided()', () => {
        beforeEach(() => {
            Config._initializeConfig = jest.fn((context, options) => ({ context, options }));
            createContext.mockClear();
        });

        it('should throw on apiKey not provided', async () => {
            const options = { apiKey: undefined };
            await expectThrows(async () => { // eslint-disable-line
                await Config.fromProvided(options);
            });
            expect(Config._initializeConfig).not.toBeCalled();
        });

        it('should throw on url being null', async () => {
            const options = { apiKey: 'api key', url: null };
            await expectThrows(async () => { // eslint-disable-line
                await Config.fromProvided(options);
            });
            expect(Config._initializeConfig).not.toBeCalled();
        });

        it('should rethrow if something breaks at following operations', async () => {
            const options = { apiKey: 'api key', url: 'url' };
            Config._initializeConfig = jest.fn(() => {
                throw new Error();
            });

            await expectThrows(async () => { // eslint-disable-line
                await Config.fromProvided(options);
            }, CFError);
            expect(Config._initializeConfig).toBeCalled();
        });

        it('should continue processing when api key is provided using default url', async () => {
            const options = { apiKey: 'api key' };
            await Config.fromProvided(options);

            expect(createContext).lastCalledWith(options.apiKey, defaults.URL);
            expect(Config._initializeConfig).lastCalledWith({ token: options.apiKey, url: defaults.URL }, options);
        });

        it('should continue processing when api key and url are provided', async () => {
            const options = { apiKey: 'api key', url: 'url' };
            await Config.fromProvided(options);

            expect(createContext).lastCalledWith(options.apiKey, options.url);
            expect(Config._initializeConfig).lastCalledWith({ token: options.apiKey, url: options.url }, options);
        });

        it('should add _recreator function to config and it must equal Config.fromProvided', async () => {
            const options = { apiKey: 'api key', url: 'url' };
            const config = await Config.fromProvided(options);

            expect(config).not.toBeNull();
            expect(config._recreator).not.toBeNull();
            expect(config._recreator.name).toBe(Config.fromProvided.bind(Config).name);
        });
    });

    describe('#fromEnv()', () => {
        beforeEach(() => {
            Config._initializeConfig = jest.fn((context, options) => ({ context, options }));
            Config.fromProvided = jest.fn(({ apiKey, url }) => ({
                context: { token: apiKey, url },
                options: { apiKey, url },
            }));
        });

        it('should throw on apiKey not provided at process.env.CF_API_KEY', async () => {
            const options = {};
            await expectThrows(async () => { // eslint-disable-line
                await Config.fromEnv(options);
            });
            expect(Config.fromProvided).not.toBeCalled();
        });

        it('should rethrow if something breaks at following operations', async () => {
            process.env.CF_API_KEY = 'apiKey';
            const options = {};
            Config.fromProvided = jest.fn(() => {
                throw new Error();
            });

            await expectThrows(async () => { // eslint-disable-line
                await Config.fromEnv(options);
            }, CFError);
            expect(Config.fromProvided).toBeCalled();
        });

        it('should continue processing when process.env.CF_API_KEY is provided', async () => {
            const testApiKey = 'api key';
            process.env.CF_API_KEY = testApiKey;
            const options = {};
            await Config.fromEnv(options);

            expect(Config.fromProvided).lastCalledWith({ apiKey: testApiKey, url: undefined });
        });

        it('should continue processing when process.env.CF_API_KEY and process.env.CF_URL are provided', async () => {
            const testUrl = 'url';
            const testApiKey = 'api key';

            process.env.CF_API_KEY = testApiKey;
            process.env.CF_URL = testUrl;

            const options = {};
            await Config.fromEnv(options);

            expect(Config.fromProvided).lastCalledWith({ apiKey: testApiKey, url: testUrl });
        });

        it('should add _recreator function to config and it must equal Config.fromEnv', async () => {
            const options = { apiKey: 'api key', url: 'url' };
            const config = await Config.fromEnv(options);

            expect(config).not.toBeNull();
            expect(config._recreator).not.toBeNull();
            expect(config._recreator.name).toBe(Config.fromEnv.bind(Config).name);
        });
    });

    describe('#fromFile()', () => {
        beforeEach(() => {
            Config._initializeConfig = jest.fn((context, options) => ({ context, options }));
            manager.loadConfig = jest.fn();
            manager.hasContexts = jest.fn(() => true);
            manager.getCurrentContext = jest.fn(() => ({}));
            manager.getContextByName = jest.fn(() => ({}));
        });

        it('should load config from default path when not specified', async () => {
            const options = {};
            await Config.fromFile(options);
            expect(manager.loadConfig).toBeCalledWith(defaults.CF_CONFIG_PATH);
        });

        it('should load config from specific path when provided', async () => {
            const options = { configPath: 'path' };
            await Config.fromFile(options);
            expect(manager.loadConfig).toBeCalledWith(options.configPath);
        });

        it('should throw on no such context', async () => {
            manager.getContextByName = jest.fn(() => null);
            const options = { context: 'not-existing' };

            await expectThrows(async () => { // eslint-disable-line
                await Config.fromFile(options);
            });

            expect(manager.loadConfig).toBeCalled();
            expect(manager.getContextByName).toBeCalledWith(options.context);
            expect(Config._initializeConfig).not.toBeCalled();
        });

        it('should throw on no current context', async () => {
            manager.getCurrentContext = jest.fn(() => null);
            const options = {};

            await expectThrows(async () => { // eslint-disable-line
                await Config.fromFile(options);
            });

            expect(manager.loadConfig).toBeCalled();
            expect(manager.getCurrentContext).toBeCalled();
            expect(Config._initializeConfig).not.toBeCalled();
        });

        it('should rethrow if something breaks at following operations', async () => {
            process.env.CF_API_KEY = 'apiKey';
            const options = {};
            Config._initializeConfig = jest.fn(() => {
                throw new Error();
            });

            await expectThrows(async () => { // eslint-disable-line
                await Config.fromFile(options);
            }, CFError);
            expect(Config._initializeConfig).toBeCalled();
        });

        it('should not get current context when getting by name', async () => {
            manager.getContextByName = jest.fn(() => ({}));
            const options = { context: 'exising' };

            await Config.fromFile(options);

            expect(manager.loadConfig).toBeCalled();
            expect(manager.getContextByName).toBeCalledWith(options.context);
            expect(manager.getCurrentContext).not.toBeCalled();
            expect(Config._initializeConfig).toBeCalled();
        });

        it('should not get context by name when name is not specified', async () => {
            const options = { context: undefined };

            await Config.fromFile(options);

            expect(manager.loadConfig).toBeCalled();
            expect(manager.getContextByName).not.toBeCalled();
            expect(manager.getCurrentContext).toBeCalled();
            expect(Config._initializeConfig).toBeCalled();
        });

        it('should use NoAuthContext when no contexts are at file with default url (when not provided)', async () => {
            manager.hasContexts = jest.fn(() => false);
            const options = {};

            const config = await Config.fromFile(options);

            expect(manager.loadConfig).toBeCalled();
            expect(manager.hasContexts).toBeCalled();
            expect(Config._initializeConfig).toBeCalled();

            expect(config.context).not.toBeNull();
            expect(config.context).toBeInstanceOf(contexts.NoAuthContext);
            expect(config.context.url).toBe(defaults.URL);
        });

        it('should use NoAuthContext when no contexts are at file with specific url (when provided)', async () => {
            manager.hasContexts = jest.fn(() => false);
            const options = { url: 'url' };

            const config = await Config.fromFile(options);

            expect(manager.loadConfig).toBeCalled();
            expect(manager.hasContexts).toBeCalled();
            expect(Config._initializeConfig).toBeCalled();

            expect(config.context).not.toBeNull();
            expect(config.context).toBeInstanceOf(contexts.NoAuthContext);
            expect(config.context.url).toBe(options.url);
        });

        it('should add _recreator function to config and it must equal Config.fromFile when context loaded', async () => {
            const options = {};
            const config = await Config.fromFile(options);

            expect(manager.getCurrentContext).toBeCalled();
            expect(Config._initializeConfig).toBeCalled();
            expect(config).not.toBeNull();
            expect(config._recreator).not.toBeNull();
            expect(config._recreator.name).toBe(Config.fromFile.bind(Config).name);
        });

        it('should add _recreator function to config and it must equal Config.fromFile when using NoAuthContext', async () => {
            manager.hasContexts = jest.fn(() => false);
            const options = {};
            const config = await Config.fromFile(options);

            expect(manager.hasContexts).toBeCalled();
            expect(Config._initializeConfig).toBeCalled();
            expect(config).not.toBeNull();
            expect(config._recreator).not.toBeNull();
            expect(config._recreator.name).toBe(Config.fromFile.bind(Config).name);
        });
    });

    describe('#_initializeConfig()', () => {
        beforeEach(() => {
            Swagger.mockClear();
            Http.mockClear();
            Http.__getClient().mockClear();
        });

        it('should throw when context not provided', async () => {
            const context = null;
            const options = {};

            await expectThrows(async () => { // eslint-disable-line
                await Config._initializeConfig(context, options);
            });
            expect(Http).not.toBeCalled();
        });

        it('should use context.url as baseUrl for Http baseUrl when not specified', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const options = {};

            await Config._initializeConfig(context, options);

            expect(context.prepareHttpOptions).toBeCalled();
            expect(Http).toBeCalledWith({ baseUrl: context.url });
        });

        it('should append context http options to http config', async () => {
            const testHttpOptions = { headers: { test: 'test' } };
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => testHttpOptions),
            };
            const options = { request: { headers: { another: 'another' } } };

            await Config._initializeConfig(context, options);

            expect(context.prepareHttpOptions).toBeCalled();
            expect(Http).toBeCalledWith(_.merge(options.request, testHttpOptions)); // baseUrl added to options.request
        });

        it('should not override http config with context http options', async () => {
            const testHttpOptions = { headers: { test: 'test' } };
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => testHttpOptions),
            };
            const options = { request: { headers: { test: 'another' } } };

            await Config._initializeConfig(context, options);

            expect(context.prepareHttpOptions).toBeCalled();
            expect(Http).toBeCalledWith(options.request); // baseUrl added to options.request
        });

        it('should not load spec when provided', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const testSpec = { test: 'test' };
            const options = { spec: { json: testSpec } };
            await Config._initializeConfig(context, options);

            expect(Http.__getClient()).not.toBeCalled();
            expect(options.spec.json).toEqual(testSpec);
        });

        it('should load spec from default specUrl when not provided', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const loadedSpec = { test: 'test' };
            Http.__setResponse(loadedSpec);
            const options = {};
            await Config._initializeConfig(context, options);

            expect(Http.__getClient()).toBeCalledWith({ url: `${context.url}${defaults.SPEC_URL_SUFFIX}` });
            expect(options.spec.json).toEqual(loadedSpec);
        });

        it('should load spec from specific specUrl when provided', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const loadedSpec = { test: 'test' };
            Http.__setResponse(loadedSpec);
            const options = { spec: { url: 'url' } };
            await Config._initializeConfig(context, options);

            expect(Http.__getClient()).toBeCalledWith({ url: options.spec.url });
            expect(options.spec.json).toEqual(loadedSpec);
        });

        it('should parse spec if it is a string', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const jsonStr = JSON.stringify({ test: 'test' });
            const options = { spec: { json: jsonStr } };
            await Config._initializeConfig(context, options);

            expect(Http.__getClient()).not.toBeCalled();
            expect(options.spec.json).toEqual(expect.objectContaining(JSON.parse(jsonStr)));
        });

        it('should replace url at spec with context url', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const specJson = { test: 'test' };
            const options = { spec: { json: specJson } };
            const config = await Config._initializeConfig(context, options);

            expect(config.swagger.spec.servers).toEqual([{ url: `${context.url}${defaults.API_SUFFIX}` }]);
        });

        it('should create swagger client with provided http layer and spec', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const specJson = { test: 'test' };
            const options = { spec: { json: specJson } };
            const config = await Config._initializeConfig(context, options);

            const swaggerOptions = { http: Http.__getClient(), spec: specJson };
            expect(Swagger).toBeCalledWith(swaggerOptions);
            expect(config.swagger).toEqual(swaggerOptions); // mocked Swagger just returns its options
        });

        it('should create config with context, swagger, options and http', async () => {
            const context = {
                url: 'url',
                prepareHttpOptions: jest.fn(() => ({})),
            };
            const specJson = { test: 'test' };
            const options = { spec: { json: specJson }, test: 'test' };
            const config = await Config._initializeConfig(context, options);

            const swaggerOptions = { http: Http.__getClient(), spec: specJson };
            expect(config).toEqual({
                context,
                options,
                swagger: swaggerOptions, // mocked Swagger just returns its options
                http: Http.__getClient(),
                _recreator: null,
            });
        });
    });

    describe('#autoDetect()', () => {
        it('should load from provided first', async () => {
            Config.fromProvided = jest.fn(() => ({}));
            Config.fromEnv = jest.fn(() => ({}));
            Config.fromFile = jest.fn(() => ({}));

            await Config.autoDetect();

            expect(Config.fromProvided).toBeCalled();
            expect(Config.fromEnv).not.toBeCalled();
            expect(Config.fromFile).not.toBeCalled();
        });

        it('should load from env when could not load from provided', async () => {
            Config.fromProvided = jest.fn(() => {
                throw new Error();
            });
            Config.fromEnv = jest.fn(() => ({}));
            Config.fromFile = jest.fn(() => ({}));

            await Config.autoDetect();

            expect(Config.fromProvided).toBeCalled();
            expect(Config.fromEnv).toBeCalled();
            expect(Config.fromFile).not.toBeCalled();
        });

        it('should load from file when could not load from env', async () => {
            Config.fromProvided = jest.fn(() => {
                throw new Error();
            });
            Config.fromEnv = jest.fn(() => {
                throw new Error();
            });
            Config.fromFile = jest.fn(() => ({}));

            await Config.autoDetect();

            expect(Config.fromProvided).toBeCalled();
            expect(Config.fromEnv).toBeCalled();
            expect(Config.fromFile).toBeCalled();
        });

        it('should throw when could not load from file', async () => {
            Config.fromProvided = jest.fn(() => {
                throw new Error();
            });
            Config.fromEnv = jest.fn(() => {
                throw new Error();
            });
            Config.fromFile = jest.fn(() => {
                throw new Error();
            });

            await expectThrows(async () => { // eslint-disable-line
                await Config.autoDetect();
            });

            expect(Config.fromProvided).toBeCalled();
            expect(Config.fromEnv).toBeCalled();
            expect(Config.fromFile).toBeCalled();
        });
    });

    describe('#manager()', () => {
        it('should provide instance of config manager', async () => {
            const config = await Config.fromProvided({ apiKey: 'apiKey' });

            expect(config.manager()).toBe(manager);
        });
    });

    describe('Config.manager()', () => {
        it('should provide instance of config manager', async () => {
            expect(Config.manager()).toBe(manager);

        });
    });

    describe('#recreate()', () => {
        it('should be able to "recreate" itself', async () => {
            const config = await Config.fromProvided({ apiKey: 'apiKey' });
            const newConfig = await config.recreate();

            expect(config.options).toEqual(newConfig.options);
        });
    });
});
