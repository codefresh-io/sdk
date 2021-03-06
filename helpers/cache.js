const path = require('path');
const fs = require('fs');
const request = require('request-promise').defaults({ resolveWithFullResponse: true });
const CFError = require('cf-errors');
const moment = require('moment');
const debug = require('debug')('codefresh:sdk:cache');

const defaults = require('../lib/defaults');
const { handleErrors } = require('./error');

async function _downloadSpec(url) {
    try {
        debug('downloading spec:', url);
        const response = await request({ url });
        handleErrors(response);
        debug('spec downloaded)');
        return JSON.parse(response.body);
    } catch (e) {
        const message = `Sdk: Could not load openapi.json from url: ${url}`;
        debug(message);
        throw new CFError({ message, cause: e });
    }
}

/**
 * TODO : rework later, when openapi.json versions on cf-api are implemented
 * loads spec either from filesystem cache or from url:
 * 1) cache lifetime - 1 day
 * 2) use forceRefresh in order to refresh cache anyway
 * 3) use disableCache in order not to write/read cache at all
 * */
const loadOpenApiSpec = async ({ specUrl = null, disableCache = false, forceRefresh = false } = {}) => {
    const url = specUrl || defaults.SPEC_URL;
    if (disableCache) {
        debug('spec cache disabled');
        return _downloadSpec(url);
    }

    const currentDate = moment().format('YYYY-MM-DD');
    const cacheDir = path.join(defaults.CODEFRESH_PATH, 'openapi-cache');
    const cacheFileName = `openapi-${currentDate}.json`;
    const cachePath = path.join(cacheDir, cacheFileName);

    const cacheExists = fs.existsSync(cachePath);

    if (cacheExists && !forceRefresh) {
        debug('reading spec from cache:', cacheFileName);
        try {
            const spec = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            if (spec) {
                return spec;
            }
        } catch (e) {
            debug(e.stack);
            debug('Could not read spec from cache -- refreshing');
        }
    }

    if (!fs.existsSync(defaults.CODEFRESH_PATH)) {
        fs.mkdirSync(defaults.CODEFRESH_PATH);
    }
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
    }

    const spec = await _downloadSpec(url);
    debug('writing cache to file:', cacheFileName);
    fs.writeFileSync(cachePath, JSON.stringify(spec, null, '\t'));
    return spec;
};

/* eslint-disable */
module.exports = {
    loadOpenApiSpec,
};
