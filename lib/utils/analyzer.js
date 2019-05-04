const _ = require('lodash');
const esprima = require('esprima');
const fse = require('fs-extra');
const flat = require('flat');
const recursive = require('recursive-readdir');
const debug = require('debug')('codefresh:sdk:utils:analyzer');
const Promise = require('bluebird');

const SdkUsage = require('./sdk-usage');

const REGEX = {
    sdk: {
        filter: /.*callee(\.object)+\.name=sdk/,
        replace: /\.callee\..+\.name=sdk/,
    },
    args: /arguments\.0\.properties\.\d+\.key.name=/,
    path: /callee(\.object)+\.property\.name=/g,
};

const PREDEFINED_OPERATIONS = [
    'configure',
    'http',
    'showWorkflowLogs',
    'workflows.waitForStatus',
    'clusters.create',
    'logs.showWorkflowLogs',
];
const PROMISE_OPERATIONS = ['then', 'catch'];

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
        debug('analyzing:', this.filename);
        const sdkCalls = this._extractCalls();

        debug('calls: %O', sdkCalls);

        return _.chain(sdkCalls)
            .map((callPath) => {
                let call = _.get(this.ast, callPath);
                let operation = _.get(call, 'callee.property.name');
                while (operation) {
                    if (!_.includes(PROMISE_OPERATIONS, operation)) {
                        break;
                    }
                    call = _.get(call, 'callee.object');
                    operation = _.get(call, 'callee.property.name');
                }

                const flatCall = flat(call);
                let sdkPath = this._extractSdkPath(flatCall);
                sdkPath = sdkPath ? `${sdkPath}.${operation}` : operation;

                if (_.includes(PREDEFINED_OPERATIONS, sdkPath)) {
                    console.info(`Skipping predefined operation: ${sdkPath}\n\t${this.filename}`);
                    return;
                }

                const params = this._extractParams(flatCall);
                const line = this._defineLine(sdkPath);
                const bodyExists = this._defineBodyExists(flatCall);
                const referenceFirstArg = _.get(call, 'arguments.0.name');

                // eslint-disable-next-line consistent-return
                return new SdkUsage({
                    filename: this.filename,
                    line,
                    operation: sdkPath,
                    params,
                    bodyExists,
                    referenceFirstArg,
                });
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

    _defineBodyExists(flatCall) {
        return !_.chain(flatCall)
            .keys()
            .filter(s => s.startsWith('arguments.1'))
            .isEmpty()
            .value();
    }

    static async analyzeFile(filename) {
        const file = await fse.readFile(filename, 'utf8');
        return new Analyzer(filename, file).analyze();
    }

    static async analyzeDir(dir, filters = []) {
        const files = _.chain(await recursive(dir, ['node_modules', 'docdock'].concat(filters)))
            .filter(s => s.endsWith('.js'))
            .value();
        return _.chain(await Promise.map(files, filename => Analyzer.analyzeFile(filename)))
            .flatten()
            .value();
    }
}

module.exports = Analyzer;
