const _ = require('lodash');
const debug = require('debug')('codefresh:sdk:logic');

const LOGIC_RESOURCES = require('./logic');

class Logic {
    constructor(sdk) {
        this.sdk = sdk;
        debug('init logic resources:');
        this.logic = _.reduce(LOGIC_RESOURCES, (acc, Resource, path) => {
            const resource = new Resource(this.sdk);
            debug(`sdk.${path} -- ${resource}`);
            const temp = {};
            _.set(temp, path, resource.getApis());
            return _.merge(acc, temp);
        }, {});
        _.merge(sdk, this.logic);
    }
}

module.exports = Logic;
