const Resource = require('../Resource.base');

class Workflow extends Resource {
    get() {
        return 'Workflow';
    }
}

module.exports = Workflow;
