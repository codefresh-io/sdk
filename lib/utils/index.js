const _ = require('lodash');
const path = require('path');
const recursive = require('recursive-readdir');
const Analyzer = require('./analyzer');
const Promise = require('bluebird');

require('yargs')
    .command('analyze [path]',
        'analyze for sdk usages',
        yargs => yargs.positional('path', { default: '.' }),
        async (argv) => {
            const sourcesPath = path.resolve(process.cwd(), argv.path);
            const files = _.chain(await recursive(sourcesPath, ['node_modules']))
                .filter(s => s.endsWith('.js'))
                .value();
            console.log(files);
            const usages = _.chain(await Promise.map(files, filename => Analyzer.analyze(filename)))
                .flatten()
                .value();
            console.log(usages);
        })
    .parse();
