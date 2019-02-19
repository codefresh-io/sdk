const _ = require('lodash');
const fs = require('fs');
const debug = require('debug')('codefresh:sdk:logic');

const LOGIC = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.logic.js'))
    .reduce((acc, file) => {
        const name = file.replace('.logic.js', '');
        acc[name] = require(`./${file}`); // eslint-disable-line
        return acc;
    }, {});

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
