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
        this.sdk = sdk.proxy();
        this.logic = _.reduce(LOGIC, (acc, Resource, path) => {
            const resource = new Resource(this.sdk);
            const temp = {};
            _.set(temp, path, resource);
            return _.merge(acc, temp);
        }, {});
        debug('apis: %O', this.logic);
    }

    resolve(path) {
        const handler = _.get(this.logic, path);
        if (handler) debug(`logic path: ${path}`);
        return handler;
    }
}

module.exports = Logic;
