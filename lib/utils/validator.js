const _ = require('lodash');
const fse = require('fs-extra');

class Validator {
    constructor(usages, spec) {
        this.usages = usages;
        this.spec = {};
        this.errors = [];
        this.spec = this._prepareSpec(spec);
    }

    validate() {
        _.forEach(this.usages, (usage) => {
            const { filename, line, operation, referenceFirstArg, bodyExists } = usage;
            const methodSpec = this.spec[operation];

            if (referenceFirstArg && (bodyExists || !methodSpec.requestBody)) {
                console.error(`Could not validate sdk usage - parameters are passed as object ref: ${referenceFirstArg}`
                    + `\n\t${filename}:${line}`);
                return;
            }

            if (!methodSpec) {
                this._addError({}, usage, `No such operation inside the spec: ${operation}`);
                return;
            }
            this._validateParams(usage, methodSpec);
        });
        return this.errors;
    }

    _prepareSpec(spec) {
        return _.chain(spec)
            .get('paths')
            .map((resource, url) => { // eslint-disable-line
                return _.map(resource, (method, methodName) => { // eslint-disable-line
                    return _.merge(method, {
                        url,
                        method: methodName,
                    });
                });
            })
            .flatten()
            .filter(m => m['x-sdk-interface'])
            .reduce((acc, method) => {
                const sdkInterface = method['x-sdk-interface'];
                method.parameters = this._dereference(method.parameters, spec); // eslint-disable-line
                return _.merge(acc, { // eslint-disable-line
                    [sdkInterface]: method,
                });
            })
            .value();
    }

    _dereference(params, spec) {
        const simpleParams = _.filter(params, p => !p.$ref);
        return _.chain(params)
            .filter(p => p.$ref)
            .map((refParam) => {
                const ref = refParam.$ref.replace('#/', '').replace(/\//g, '.');
                return _.get(spec, ref);
            })
            .concat(simpleParams)
            .value();
    }

    _validateParams(usage, methodSpec) {
        const usageParams = usage.params;
        const specParams = methodSpec.parameters;
        _.forEach(specParams, (param) => {
            if (param.required && !_.includes(usageParams, param.name)) {
                this._addError(methodSpec, usage, `Missing required param: ${param.name}`);
            }
        });

        if (methodSpec.requestBody && !usage.bodyExists) {
            return;
        }

        const paramsMap = _.reduce(specParams, (acc, p) => _.merge(acc, { [p.name]: p }), {});
        _.forEach(usageParams, (param) => {
            if (!paramsMap[param]) {
                this._addError(methodSpec, usage, `Param is not described at spec: ${param}`);
            }
        });
    }

    _addError(methodSpec, usage, message) {
        this.errors.push({
            message,
            path: `${usage.filename}:${usage.line}`,
            operation: usage.operation,
        });
    }

    static async validate(usages, specPath) {
        const spec = await fse.readJson(specPath, 'utf8');
        return new Validator(usages, spec).validate();
    }
}

module.exports = Validator;
