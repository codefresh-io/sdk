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
        this.logic = _.mapValues(LOGIC, (Resource) => {
            return new Resource(this.sdk);
        })
    }

    resolve(path) {
        return _.get(this.logic, path);
    }
}

module.exports = Logic;
