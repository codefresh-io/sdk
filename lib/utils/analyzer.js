const _ = require('lodash');
const esprima = require('esprima');
const fse = require('fs-extra');
const flat = require('flat');
const debug = require('debug')('codefresh:sdk:utils:parser');

const SdkUsage = require('./sdk-usage');

const REGEX = {
    sdk: {
        filter: /.*callee(\.object)+\.name=sdk/,
        replace: /\.callee\..+\.name=sdk/,
    },
    args: /arguments\.0\.properties\.\d+\.key.name=/,
    path: /callee(\.object)+\.property\.name=/g,
};

const PREDEFINED_OPERATIONS = ['configure'];

const keyValToString = (value, key) => `${key}=${value}`;

class Analyzer {
    constructor(filename, file) {
        this.filename = filename;
        this.file = file;
        this.ast = esprima.parse(file);
        this.lines = _.chain(file)
            .split('\n')
            .map(s => _.trim(s))
            .value();
        this.usedLines = {};
    }

    analyze() {
        const sdkCalls = this._extractCalls();

        debug('calls: %O', sdkCalls);

        return _.chain(sdkCalls)
            .map((path) => {
                const call = _.get(this.ast, path);

                const operation = _.get(call, 'callee.property.name');
                if (_.includes(PREDEFINED_OPERATIONS, operation)) {
                    console.error(`skipping predefined operation: ${operation}`);
                    return;
                }

                const flatCall = flat(call);
                const params = this._extractParams(flatCall);
                let sdkPath = this._extractSdkPath(flatCall);
                sdkPath = `${sdkPath}.${operation}`;
                const line = this._defineLine(sdkPath);

                const usage = new SdkUsage({
                    filename: this.filename,
                    line,
                    path: sdkPath,
                    params,
                });
                debug('%O', usage);

                return usage; // eslint-disable-line consistent-return
            })
            .filter(_.identity)
            .value();
    }

    _extractParams(flatCall) {
        return _.chain(flatCall)
            .map(keyValToString)
            .filter(s => REGEX.args.test(s))
            .map(s => s.replace(REGEX.args, ''))
            .value();
    }

    _extractSdkPath(flatCall) {
        return _.chain(flatCall)
            .map(keyValToString)
            .filter(s => REGEX.path.test(s))
            .map(s => s.replace(REGEX.path, ''))
            .join('.')
            .value();
    }

    _extractCalls() {
        return _.chain(flat(this.ast))
            .map(keyValToString)
            .filter(s => REGEX.sdk.filter.test(s))
            .map(s => s.replace(REGEX.sdk.replace, ''))
            .value();
    }

    _defineLine(sdkPath) {
        const sdkCallString = `sdk.${sdkPath}`;
        let lineNumber = 0;
        // eslint-disable-next-line consistent-return
        _.forEach(this.lines, (line, index) => {
            if (!_.includes(this.usedLines[index], sdkCallString) && _.includes(line, sdkCallString)) {
                lineNumber = index + 1;
                if (!this.usedLines[index]) {
                    this.usedLines[index] = [];
                }
                this.usedLines[index].push(sdkCallString);
                return false;
            }
        });
        return lineNumber;
    }

    static async analyze(filename) {
        const file = await fse.readFile(filename, 'utf8');
        return new Analyzer(filename, file).analyze();
    }
}

module.exports = Analyzer;
