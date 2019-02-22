const fs = require('fs');
const yaml = require('js-yaml');
const CFError = require('cf-errors');
const path = require('path');

const { ConfigManager } = require('../lib/auth');
const defaults = require('../lib/defaults');

const manager = new ConfigManager();

jest.mock('fs', () => {
    const mock = {};
    mock.readFile = function readFile() {
        return this._readFile(...arguments); // eslint-disable-line
    }.bind(mock);
    mock.mkdir = function readFile() {
        return this._mkdir(...arguments); // eslint-disable-line
    }.bind(mock);
    mock.writeFile = function readFile() {
        return this._writeFile(...arguments); // eslint-disable-line
    }.bind(mock);
    return mock;
});

jest.mock('bluebird', () => ({ promisify: func => func }));

// todo : finish
describe('ConfigManager', () => {
    beforeEach(() => {
        const testData = { test: 'test' };
        fs._readFile = jest.fn(() => testData);
        fs._mkdir = jest.fn();
        fs._writeFile = jest.fn();
        yaml.safeDump = jest.fn(data => data);
        yaml.safeLoad = jest.fn(data => data);
    });

    describe('#_loadConfig', () => {
        it('should use default path when not specified', async () => {
            await manager._loadConfig();

            expect(fs._readFile).toBeCalledWith(defaults.CF_CONFIG_PATH, 'utf8');
        });

        it('should read from specific path when provided', async () => {
            const configFilePath = 'some/path';
            await manager._loadConfig(configFilePath);

            expect(fs._readFile).toBeCalledWith(configFilePath, 'utf8');
        });

        it('should create file when it does not exist and write empty config to it', async () => {
            fs._readFile = jest.fn(() => {
                throw new CFError({ code: 'ENOENT' });
            });
            const emptyConfig = {
                contexts: {},
                'current-context': '',
            };

            await manager._loadConfig();

            expect(fs._readFile).toBeCalled();
            expect(fs._mkdir).toBeCalledWith(path.dirname(defaults.CF_CONFIG_PATH), { recursive: true });
            expect(fs._writeFile).toBeCalledWith(defaults.CF_CONFIG_PATH, emptyConfig, 'utf8');
        });

        it('should return empty config when file does not exist', async () => {
            fs._readFile = jest.fn(() => {
                throw new CFError({ code: 'ENOENT' });
            });
            const defaultConfig = {
                contexts: {},
                'current-context': '',
            };

            const config = await manager._loadConfig();

            expect(fs._readFile).toBeCalled();
            expect(config).toEqual(defaultConfig);
        });

        it('should throw error when it`s code is not ENOENT', async () => {
            fs._readFile = jest.fn(() => {
                throw new Error();
            });
            await expectThrows(async () => { // eslint-disable-line
                await manager._loadConfig();
            }, CFError);
        });

        it('should read file when it exists and dump data from yaml', async () => {
            const config = await manager._loadConfig();

            expect(fs._readFile).toBeCalled();
            expect(config).toEqual(fs._readFile()); // equals mock data
            expect(fs._mkdir).not.toBeCalled();
            expect(fs._writeFile).not.toBeCalled();
        });
    });

    describe('#loadConfig', () => {
        it('test', () => {
            expect(3)
                .toEqual(3);
        });
    });

    describe('#createContext', () => {
        it('test', () => {
            expect(3)
                .toEqual(3);
        });
    });

    describe('#persistConfig', () => {
        it('test', () => {
            expect(3)
                .toEqual(3);
        });
    });
});
