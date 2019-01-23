const _ = require('lodash');
const Client = require('./Client');
const Logic = require('./logic');


class Sdk {
  constructor(config) {
    this.config = config;
    this.client = Client(config);
    this.logic = new Logic(this);
  }

  resolve(path, args) {
    console.log('Sdk:', path, args); // todo: remove

    let handler = this.logic.resolveHandler(path);
    if (!handler) {
      handler = _.get(this.client, path);
    }
    return handler(...args);
  }
}

module.exports = Sdk;
