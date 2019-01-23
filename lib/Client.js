const {propertyCollector} = require('../helpers');
const Swagger = require('swagger-client');
const _ = require('lodash');

const DEFAULT_CODEFRESH_URL = 'https://g.codefresh.io';
const DEFAULT_SPEC_URL = `${DEFAULT_CODEFRESH_URL}/api/swagger.json`;

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
    return (await handler(...args)).body;
  }

  async loadClient() {
    if (!this.api) {
      const {spec, specUrl, apiKey, url} = this.config;
      const swaggerConfig = {
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
}

/**
 *  this Proxy was needed due to asynchronous Swagger constructor
 *  */
function Client(config) {
  const client = new _Client(config);
  return propertyCollector(client.resolve.bind(client));
}

module.exports = Client;
