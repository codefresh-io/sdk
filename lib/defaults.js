const { homedir } = require('os');
const path = require('path');

const DEFAULTS = {
    URL: 'https://g.codefresh.io',
    CF_CONFIG_PATH: `${process.env.HOME || process.env.USERPROFILE}/.cfconfig`,
    CF_TOKEN_ENV_VAR_NAME: 'CF_API_KEY',
    CF_URL_ENV_VAR_NAME: 'CF_URL',
    SPEC_URL_SUFFIX: '/api/openapi.json',
    CODEFRESH_PATH: path.resolve(homedir(), '.Codefresh'),
    DEBUG_PATTERN: 'codefresh',
    TIMEOUT: 30000,
    MAX_RETRIES: 5,
    RETRY_DELAY: 1000,
};

module.exports = DEFAULTS;
