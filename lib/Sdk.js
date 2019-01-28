const _ = require('lodash');
const Client = require('./Client');
const Logic = require('./logic');
const {resourceProxy} = require('../helpers');

class Sdk {
  constructor(config) {
    if (config) {
      this.configure(config);
    }
    this.resourcesCache = {}
  }

  resolve(prop) {
    if (prop === 'configure') {
      return this.configure.bind(this);
    }
    if (!this.config) {
      throw new Error('Sdk is not configured. Please call codefresh.configure() with proper config');
    }
    return this.resolveResource(prop);
  }

  configure(config) {
    this.config = config;
    this.client = new Client(config);
    this.logic = new Logic(this);
  }

  resolveResource(name) {
    let resource = this.resourcesCache[name];
    if (!resource) {
      resource = resourceProxy(this.client.resolve.bind(this.client), this.logic.resolve.bind(this.logic), name);
    }
    return resource;
  }
}

module.exports = Sdk;
