const Resource = require('../Resource.base');

class Pipeline extends Resource {
    get() {
        return 'Pipeline';
    }
}

module.exports = Pipeline;
