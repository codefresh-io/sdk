const { homedir } = require('os');
const path = require('path');

const DEFAULTS = {
    URL: 'https://g.codefresh.io',
    CODEFRESH_PATH: path.resolve(homedir(), '.Codefresh'),
    MAX_RETRIES: 5,
    RETRY_DELAY: 1000,
};

DEFAULTS.SPEC_URL = `${DEFAULTS.URL}/api/openapi.json`;

module.exports = DEFAULTS;
