const _ = require('lodash');
const request = require('requestretry');
const debug = require('debug')('codefresh:sdk:http');
const defaults = require('../lib/defaults');

const { handleErrors } = require('../helpers/error');

const RETRY_STATUS_CODES = [502, 503, 504];
const RETRY_STRATEGY = (err, response) => !(process.env.DEBUG || '').startsWith(defaults.DEBUG_PATTERN) && (request.RetryStrategies.NetworkError(err) || RETRY_STATUS_CODES.includes(response.statusCode)); // eslint-disable-line max-len

function _hideHeaders(config) {
    const _config = _.cloneDeep(config);
    const authHeader = _.get(config, 'headers.Authorization');
    if (authHeader) {
        _config.headers.Authorization = `${authHeader.substring(0, 10)}...`;
    }
    const accessTokenHeader = _.get(config, 'headers.x-access-token');
    if (accessTokenHeader) {
        _config.headers['x-access-token'] = `${accessTokenHeader.substring(0, 10)}...`;
    }
    return _config;
}

const Http = (options) => {
    const {
        baseUrl,
        timeout,
        maxAttempts,
        retryDelay,
        retryStrategy,
        headers,
    } = options || {};

    const config = {
        timeout: timeout || defaults.TIMEOUT,
        maxAttempts: maxAttempts || defaults.MAX_RETRIES,
        retryDelay: retryDelay || defaults.RETRY_DELAY,
        retryStrategy: retryStrategy || RETRY_STRATEGY,
        headers: headers || {},
    };

    const http = request.defaults(config);

    debug('http created: %o', _hideHeaders(config));

    return new Proxy(http, {
        async apply(handler, that, args) {
            const req = _.first(args) || {};
            debug(`${req.method || 'GET'} ${req.url}`);

            if (_.startsWith(req.url, '/') && baseUrl) {
                req.url = `${baseUrl}${req.url}`;
            }
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

Http.RETRY_STRATEGY = RETRY_STRATEGY;

module.exports = { Http };
