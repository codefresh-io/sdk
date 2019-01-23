const _ = require('lodash');
const Client = require('./Client');
const Logic = require('./logic');


class Sdk {
  constructor(config) {
    if (config) {
      this.configure(config);
    }
  }

  resolve(path, args) {
    if (path === 'configure') {
      this.configure(...args);
      return;
    }
    if (!this.config) {
      throw new Error('Sdk is not configured. Please call codefresh.configure() with proper config');
    }

    console.log('Sdk:', path, args); // todo: remove

    let handler = this.logic.resolveHandler(path);
    if (!handler) {
      handler = _.get(this.client, path);
    }
    return handler(...args);
  }

  configure(config) {
    this.config = config;
    this.client = Client(config);
    this.logic = new Logic(this);
  }
}

module.exports = Sdk;
