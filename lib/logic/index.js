const _ = require('lodash');
const fs = require('fs');

const LOGIC = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.logic.js'))
    .reduce((acc, file) => {
        const name = file.replace('.logic.js', '');
        acc[name] = require(`./${file}`);
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
        }, {})
    }

    resolve(path) {
        return _.get(this.logic, path);
    }
}

module.exports = Logic;
