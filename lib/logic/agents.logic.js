
const fs = require('fs');
const { spawn } = require('child_process');
const Resource = require('./Resource.base');
const prepareSpwan = require('./Spwan.helper');


const _installVenonaScript = async (info, filePath) => {
    const {
        apiHost, // --api-host
        agentId, // --agnetId
        kubeContextName, // kube-context-name
        kubeNamespace, // --kube-namespace
        token, // --agentToken
        kubeNodeSelector, // --kube-node-selector
        dryRun, // --dryRun
        inCluster, // -inCluster
        kubernetesRunnerType, // --kubernetes-runner-type
        tolerations, // --tolerations
        venonaVersion, // --venona-version
        kubeConfigPath, // --kube-config-path
        skipVersionCheck, // --skip-version-check
        verbose, // --verbose
    } = info;

    fs.chmodSync(filePath, '755');
    const commands = [
        'install',
        'agent',
        '--agentId',
        agentId,
        '--api-host',
        apiHost,
        '--kube-context-name',
        kubeContextName,
        '--kube-namespace',
        kubeNamespace,
    ];
    if (kubeNodeSelector) {
        commands.push('--kube-node-selector');
        commands.push(kubeNodeSelector);
    }

    if (token) {
        commands.push(`--agentToken=${token}`);
    }
    if (dryRun) {
        commands.push('--dryRun');
    }
    if (inCluster) {
        commands.push('--inCluster');
    }
    if (kubernetesRunnerType) {
        commands.push(`--kubernetes-runner-type=${kubernetesRunnerType}`);
    }
    if (tolerations) {
        commands.push(`--tolerations=${tolerations}`);
    }
    if (venonaVersion) {
        commands.push(`--venona-version=${venonaVersion}`);
    }
    if (kubeConfigPath) {
        commands.push(`--kube-config-path=${kubeConfigPath}`);
    }
    if (skipVersionCheck) {
        commands.push('--skip-version-check');
    }
    if (verbose) {
        commands.push('--verbose');
    }

    const installScript = spawn(filePath, commands);
    installScript.stdout.pipe(process.stdout);
    installScript.stderr.pipe(process.stderr);
    process.stdin.pipe(installScript.stdin);
    return new Promise((resolve) => {
        installScript.on('exit', (code) => {
            resolve(code);
        });
    });
};

const _unInstallVenonaScript = async (info, filePath) => {
    const {
        kubeContextName, // kube-context-name
        kubeNamespace, // --kube-namespace
        kubeConfigPath, // --kube-config-path
        verbose, // --verbose
    } = info;

    fs.chmodSync(filePath, '755');
    const commands = [
        'uninstall',
        'agent',
        '--kube-context-name',
        kubeContextName,
        '--kube-namespace',
        kubeNamespace,
    ];


    if (kubeConfigPath) {
        commands.push(`--kube-config-path=${kubeConfigPath}`);
    }

    if (verbose) {
        commands.push('--verbose');
    }

    const unInstallScript = spawn(filePath, commands);
    unInstallScript.stdout.pipe(process.stdout);
    unInstallScript.stderr.pipe(process.stderr);
    process.stdin.pipe(unInstallScript.stdin);
    return new Promise((resolve) => {
        unInstallScript.on('exit', (code) => {
            resolve(code);
        });
    });
};

class Agents extends Resource {
    async install(info) {
        const filePath = await prepareSpwan({ name: 'agent', repoName: 'venona', pathName: 'venonactl', branch: 'v1' });
        const { terminateProcess } = info;
        const exitCode = await _installVenonaScript(info, filePath);
        if (terminateProcess) {
            process.exit(exitCode);
        }
        return exitCode;
    }

    async unInstall(info) {
        const filePath = await prepareSpwan({ name: 'agent', repoName: 'venona', pathName: 'venonactl', branch: 'v1' });
        const { terminateProcess } = info;
        const exitCode = await _unInstallVenonaScript(info, filePath);
        if (terminateProcess) {
            process.exit(exitCode);
        }
        return exitCode;
    }
}

module.exports = Agents;
