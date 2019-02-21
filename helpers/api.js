const _ = require('lodash');
const debug = require('debug')('codefresh:sdk:client:post-process');

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

function _resolveArgs(args, spec = {}) {
    let [params, requestBody] = args; // eslint-disable-line prefer-const
    if (!params) {
        if (!requestBody) {
            return args;
        }
        return [{}, { requestBody }];
    }

    // params and request body
    if (requestBody) {
        return [params, { requestBody }];
    }

    // requestBody inside params
    if (params.requestBody) {
        requestBody = params.requestBody; // eslint-disable-line prefer-destructuring
        delete params.requestBody;
        return [params, { requestBody }];
    }

    // if only params passed and method has request body, params is the request body
    if (spec.requestBody) {
        return [params, { requestBody: params }];
    }
    return [params];
}

/**
 * @returns {Object} example: { 'data[name]': val, 'data[surname]': val2 }
 * */
function _serializeObjectAsQueryParam(object, paramName) {
    return _.mapKeys(object, (value, key) => `${paramName}[${key}]`);
}

function _wrapHandler(func, spec) {
    const wrapper = function () { // eslint-disable-line
        const args = _resolveArgs(arguments, spec); // eslint-disable-line
        const params = _.first(args);
        if (!_.isEmpty(params)) {
            _.set(args, '[0]', _.mapValues(params, (value, key) => {
                if (_.isPlainObject(value)) {
                    return _serializeObjectAsQueryParam(value, key);
                }
                return value;
            }));
        }
        return func(...args);
    };
    wrapper.spec = () => spec;
    return wrapper;
}

/**
 * generate proper client from operation ids
 * */
function postProcessApi(swagger, spec) {
    const ops = _generateSwaggerOps(swagger.spec);
    const apis = _.reduce(swagger.apis, (acc, resource) => {
        const temp = _.reduce(resource, (acc, operation, operationId) => { // eslint-disable-line
            const op = _.get(ops, operationId, {});
            const methodSpec = _.get(spec, `paths.${op.url}.${op.httpMethod}`);
            if (!methodSpec || !methodSpec['x-sdk-interface']) {
                return acc;
            }

            const temp = {}; // eslint-disable-line
            _.set(temp, methodSpec['x-sdk-interface'], _wrapHandler(operation, methodSpec));
            return _.defaultsDeep(acc, temp);
        }, {});

        return _.defaultsDeep(acc, temp);
    }, {});
    debug('apis: %O', apis);
    return apis;
}

module.exports = {
    postProcessApi,
    _resolveArgs,
    _wrapHandler,
};
