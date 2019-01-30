const _ = require('lodash');

const resourceProxy = (clientHandler, logicHandler, resourceName) => {
    const children = {};
    return new Proxy(clientHandler, {
        get(handler, p) {
            const path = `${resourceName}.${p}`;
            const logicResource = logicHandler(path);
            if (logicResource) {
                return logicResource;
            }
            let child = children[p];
            if (!child) {
                child = resourceProxy(clientHandler, _.noop, path);
                children[p] = child;
            }
            return child;
        },
        apply(handler, that, args) {
            return handler(resourceName, args);
        }
    });
};

module.exports = {
    resourceProxy,
};
