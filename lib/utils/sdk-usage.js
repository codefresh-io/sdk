const _ = require('lodash');

class SdkUsage {
    constructor(options) {
        _.assign(this, _.pick(options, [
            'filename',
            'line',
            'params',
            'path',
        ]));
    }
}

module.exports = SdkUsage;
