const _ = require('lodash');

const pipelines = require('./pipelines');

const LOGIC = {
  pipelines,
};


class Logic {
  constructor(sdk) {
    this.config = sdk.config;
    this.client = sdk.client;

    this.logic = _.mapValues(LOGIC, (resource) => {
      return _.mapValues(resource, (func) => {
        return _.isFunction(func) ? func.bind(this) : func;
      })
    })
  }

  resolve(path) {
    return _.get(this.logic, path);
  }
}

module.exports = Logic;
