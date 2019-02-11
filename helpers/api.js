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
        },
    });
};

function _generateSwaggerOps(spec) {
    const ops = {};
    _.forEach(spec.paths, (resource, url) => {
        _.forEach(resource, (method, methodName) => {
            ops[method.operationId] = {
                httpMethod: methodName,
                url,
            };
        });
    });
    return ops;
}

/**
 * generate proper client from operation ids
 * */
function postProcessApi(swagger, spec) {
    const ops = _generateSwaggerOps(swagger.spec);
    return _.reduce(swagger.apis, (acc, resource) => {
        const temp = _.reduce(resource, (acc, operation, operationId) => { // eslint-disable-line
            const op = ops[operationId];
            const methodSpec = _.get(spec, `paths.${op.url}.${op.httpMethod}`);
            if (!methodSpec || !methodSpec['x-sdk-interface']) {
                return acc;
            }

            operation.spec = methodSpec; // eslint-disable-line
            const temp = {}; // eslint-disable-line
            _.set(temp, methodSpec['x-sdk-interface'], operation);
            return _.merge(acc, temp);
        }, {});

        return _.merge(acc, temp);
    }, {});
}

module.exports = {
    resourceProxy,
    postProcessApi,
};
