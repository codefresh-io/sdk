const Resource = require('../Resource.base');

class Workflow extends Resource {
    get() {
        return 'pip';
    }
}

module.exports = Workflow;
