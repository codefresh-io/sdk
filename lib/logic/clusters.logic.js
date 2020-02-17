
const fs = require('fs');
const { spawn } = require('child_process');
const Resource = require('./Resource.base');
const prepareSpwan = require('./Spwan.helper');


const _createClusterScript = (info, filePath) => {
    const {
        contextName,
        name,
        behindFirewall,
        context,
        namespace,
        serviceaccount,
    } = info;
    fs.chmodSync(filePath, '755');
    const commands = [
        'create',
        '--c',
        contextName,
        '--token',
        context.token,
        '--api-host',
        `${context.url}/`,
        '--namespace',
        namespace,
        '--serviceaccount',
        serviceaccount,
    ];
    if (name) {
        commands.push('--name-overwrite');
        commands.push(name);
    }

    if (behindFirewall) {
        commands.push('--behind-firewall');
    }
    const clusterScript = spawn(filePath, commands);
    clusterScript.stdout.pipe(process.stdout);
    clusterScript.stderr.pipe(process.stderr);
    process.stdin.pipe(clusterScript.stdin);
    clusterScript.on('exit', (code) => {
        process.exit(code);
    });
};

class Clusters extends Resource {
    async create(info) {
        const filePath = await prepareSpwan({ name: 'cluster', repoName: 'Stevedore' });
        _createClusterScript(info, filePath);
    }
}

module.exports = Clusters;
