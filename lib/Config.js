const defaults = require('./defaults');
const manager = require('./auth/manager');

class Config {

    async static fromFile(options) {
        const {
            configPath = defaults.CF_CONFIG_PATH,
            profile,
        } = options || {};




    }
}
