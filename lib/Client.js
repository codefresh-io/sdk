const {propertyCollector} = require('../helpers');
const Swagger = require('swagger-client');
const _ = require('lodash');
const CFError = require('cf-errors');
const request = require('requestretry');

const DEFAULT_CODEFRESH_URL = 'https://g.codefresh.io';
const DEFAULT_SPEC_URL = `${DEFAULT_CODEFRESH_URL}/api/swagger.json`;
const RETRY_STATUS_CODES = [502, 503, 504];
const RETRY_STRATEGY = (err, response) => {
  return process.env.DEBUG !== 'codefresh' && (request.RetryStrategies.NetworkError(err) || RETRY_STATUS_CODES.includes(response.statusCode));
};

function _makeResponseError(response) {
  return new CFError({
    statusCode: response.statusCode,
    message: JSON.stringify(response.body || response)
  });
}

class _Client {
  constructor(config) {
    this.validateConfig(config);
    this.config = config;
    this.api = null;
  }

  async resolve(path, args) {
    await this.loadClient();
    console.log('Client:', path, args); // todo: remove
    const handler = _.get(this.api, path);
    if (!handler) {
      throw new Error(`No handler for path: ${path}`);
    }
    const response = await handler(...args);

    try {
      response.body = JSON.parse(response.body); // json option at config does not work
    } catch (e) {
    }

    this.handleErrors(response);
    return response.body;
  }

  async loadClient() {
    if (!this.api) {
      const {spec, specUrl, apiKey, url} = this.config;
      const swaggerConfig = {
        http: request.defaults({
          maxAttempts: (this.config.request && this.config.request.maxRetries) || 5,
          retryDelay: (this.config.request && this.config.request.retryDelay) || 1000,
          retryStrategy: RETRY_STRATEGY
        }),
        authorizations: {
          internalApiKey: apiKey
        }
      };

      if (spec) {
        swaggerConfig.spec = spec;
      } else {
        swaggerConfig.url = specUrl || DEFAULT_SPEC_URL
      }

      const swagger = await Swagger(swaggerConfig);
      if (url) {
        swagger.spec.servers = [{url: url.endsWith('/api') ? url : `${url}/api`}];
      }

      this.api = _.mapValues(swagger.apis, (resource) => {
        const metKeys = new Set();
        _.keys(resource).forEach((key) => {
          const prop = resource[key];
          const noNumberKey = key.replace(/\d+$/, '');
          if (noNumberKey !== key && !metKeys.has(noNumberKey)) {
            delete resource[key];
            resource[noNumberKey] = prop;
            metKeys.add(noNumberKey);
          }
        });
        return resource;
      });

      console.log('Client loaded!') // todo: remove
    }
  }

  validateConfig(config) {
    const {apiKey} = config;
    if (!apiKey) {
      throw new Error('Api-key must be provided!');
    }
  }

  handleErrors(response) {
    const {statusCode} = response;

    // if for some reason request was not properly redirected (when "Location" header is lost, not usual case)
    if (statusCode >= 300 && statusCode < 400) {
      throw new CFError({
        cause: _makeResponseError(response),
        message: 'Error: Request was not properly redirected',
      });
    }
    if (statusCode === 401) {
      throw new CFError({
        cause: _makeResponseError(response),
        message: 'Error: Please create or update your authentication context',
      })
    }
    if (statusCode === 403) {
      throw new CFError({
        cause: _makeResponseError(response),
        message: 'Error: You do not have permissions to perform this action',
      });
    }

    // other status codes
    if (statusCode >= 400 && statusCode < 600) {
      if (_.get(response, 'body.message')) {
        if (_.get(response, 'body.error')) {
          throw new Error(`message: ${response.body.message}\nerror: ${response.body.error}`);
        } else {
          throw new Error(response.body.message);
        }
      } else {
        throw _makeResponseError(response);
      }
    }
  }
}

/**
 *  this Proxy was needed due to asynchronous Swagger constructor
 *  */
function Client(config) {
  const client = new _Client(config);
  return propertyCollector(client.resolve.bind(client));
}

module.exports = Client;
