const _ = require('lodash');
const { homedir } = require('os');
const path = require('path');

const DEFAULTS = {
    URL: 'https://g.codefresh.io',
    CF_CONFIG_PATH: `${process.env.HOME || process.env.USERPROFILE}/.cfconfig`,
    CF_TOKEN_ENV: 'CF_API_KEY',
    CF_URL_ENV: 'CF_URL',
    CF_CONFIG_ENV: 'CFCONFIG',
    API_SUFFIX: '/api',
    SPEC_URL_SUFFIX: '/api/openapi.json',
    CODEFRESH_PATH: path.resolve(homedir(), '.Codefresh'),
    DEBUG_PATTERN: 'codefresh',
    TIMEOUT: _.isInteger(process.env.CF_SDK_REQUEST_TIMEOUT) ? parseInt(process.env.CF_SDK_REQUEST_TIMEOUT, 10) : 30000,
    MAX_RETRIES: _.isInteger(process.env.CF_SDK_REQUEST_MAX_RETRIES) ? parseInt(process.env.CF_SDK_REQUEST_MAX_RETRIES, 10) : 5,
    RETRY_DELAY: _.isInteger(process.env.CF_SDK_REQUEST_RETRY_DELAY) ? parseInt(process.env.CF_SDK_REQUEST_RETRY_DELAY, 10) : 1000,
};

module.exports = DEFAULTS;
