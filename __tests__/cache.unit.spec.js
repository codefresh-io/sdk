const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const request = require('request-promise');

const defaults = require('../lib/defaults');
const { loadOpenApiSpec } = require('../helpers/cache');

jest.mock('../helpers/error');

jest.mock('fs', () => {
    const existPaths = [];
    let spec = {};

    return {
        existSync: p => existPaths.includes(p),
        mkDirSync: () => {},
        readFileSync: () => spec,
        writeFileSync: jest.fn((p, s) => {
            spec = s;
        }),
    };
});

jest.mock('request-promise', () => {
    const defaultResponse = { body: { spec: 'spec' } };
    let response = defaultResponse;
    let toThrow = false;

    const func = jest.fn(() => {
        if (toThrow) {
            throw new Error('client thrown');
        }
        return response;
    });

    func.defaults = () => func;
    func.__setResponse = (res) => {
        response = res;
    };
    func.__resetResponse = () => {
        response = defaultResponse;
    };
    func.__defaultResponse = () => {
        return defaultResponse;
    };
    func.__makeThrow = (toggle) => {
        toThrow = toggle;
    };

    return func;
});

JSON.parse = json => json;
JSON.stringify = json => json;

const currentDate = moment();
const cacheDir = path.join(defaults.CODEFRESH_PATH, 'openapi-cache');
const cacheFileName = `openapi-${currentDate.format('YYYY-MM-DD')}.json`;
const cachePath = path.join(cacheDir, cacheFileName);

// todo: finish
describe('cache', () => {
    beforeEach(() => {
        request.__makeThrow(false);
        request.__resetResponse();
    });

    it('should only download spec when disableCache option is true', async () => {
        const expectedSpec = request.__defaultResponse().body;
        const actualSpec = await loadOpenApiSpec({ disableCache: true });

        expect(actualSpec).toEqual(expectedSpec);
        expect(getCallsCount(request)).toBe(1); // eslint-disable-line
        expect(getLastCallArgs(request)).toBe(1); // eslint-disable-line
    });

    it('should use default spec url when it is not provided', async () => {
        await loadOpenApiSpec({ disableCache: true });

        expect(_.first(getLastCallArgs(request))).toEqual({ url: defaults.SPEC_URL }); // eslint-disable-line
    });

    it('should use url when it is provided', async () => {
        const url = 'some url';
        await loadOpenApiSpec({ disableCache: true, url });

        expect(_.first(getLastCallArgs(request))).toEqual({ url }); // eslint-disable-line
    });

    it('should throw if something wrong on downloading', async () => {
        request.__makeThrow(true);

        await expectThrows(async () => { // eslint-disable-line
            await loadOpenApiSpec({ disableCache: true });
        });

        expect(getCallsCount(request)).toBe(1); // eslint-disable-line
    });
});
