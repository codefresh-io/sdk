const Resource = require('../Resource.base');

class Pipeline extends Resource {
    get() {
        return 'pip';
    }
}

module.exports = Pipeline;
