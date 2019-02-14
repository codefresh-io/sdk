const _ = require('lodash');
const request = require('requestretry');
const debug = require('debug')('codefresh:sdk:http');
const defaults = require('../lib/defaults');

const { handleErrors } = require('../helpers/error');

const RETRY_STATUS_CODES = [502, 503, 504];
const RETRY_STRATEGY = (err, response) => (process.env.DEBUG || '').startsWith(defaults.DEBUG_PATTERN) && (request.RetryStrategies.NetworkError(err) || RETRY_STATUS_CODES.includes(response.statusCode)); // eslint-disable-line max-len

const Http = (options, isJwt = false) => {
    const {
        apiKey,
        request: {
            timeout,
            maxRetries,
            retryDelay,
        } = {},
    } = options || {};

    const config = {
        timeout: timeout || defaults.TIMEOUT,
        maxAttempts: maxRetries || defaults.MAX_RETRIES,
        retryDelay: retryDelay || defaults.RETRY_DELAY,
        retryStrategy: RETRY_STRATEGY,
    };

    if (isJwt) {
        config.headers = { 'x-access-token': apiKey };
    }
    const http = request.defaults(config);

    debug('http created: %o', config);

    return new Proxy(http, {
        async apply(handler, that, args) {
            const req = _.first(args) || {};
            debug(`${req.method} ${req.url}`);
            const response = await handler(...args);
            debug(`status: ${response.statusCode}`);
            handleErrors(response);
            try {
                response.body = JSON.parse(response.body); // json option at request config does not work properly
            } catch (e) {
                debug(`Could not parse response body: ${response.body}`);
            }
            return response.body;
        },
    });
};

module.exports = { Http };
