const _ = require('lodash');
const debug = require('debug')('codefresh:sdk:logic');

const LOGIC = require('./logic');

class Logic {
    constructor(sdk) {
        this.sdk = sdk;
        debug('init logic resources:');
        this.logic = _.reduce(LOGIC, (acc, Resource, path) => {
            const resource = new Resource(this.sdk);
            debug(`sdk.${path} -- ${resource}`);
            const temp = {};
            _.set(temp, path, resource.getApis());
            return _.merge(acc, temp);
        }, {});
        _.assign(sdk, _.defaultsDeep(sdk, this.logic));
    }
}

module.exports = Logic;
