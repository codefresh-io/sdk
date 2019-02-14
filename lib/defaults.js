const { homedir } = require('os');
const path = require('path');

const DEFAULTS = {
    URL: 'https://g.codefresh.io',
    CF_CONFIG_PATH: `${process.env.HOME || process.env.USERPROFILE}/.cfconfig`,
    CODEFRESH_PATH: path.resolve(homedir(), '.Codefresh'),
    DEBUG_PATTERN: 'codefresh',
    TIMEOUT: 30000,
    MAX_RETRIES: 5,
    RETRY_DELAY: 1000,
};

DEFAULTS.SPEC_URL = `${DEFAULTS.URL}/api/openapi.json`;

module.exports = DEFAULTS;
