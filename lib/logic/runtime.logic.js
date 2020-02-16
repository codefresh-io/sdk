
const fs = require('fs');
const { spawn } = require('child_process');
const Resource = require('./Resource.base');
const prepareSpwan = require('./Spwan.helper');


const _installRuntimeScript = async (info, filePath) => {
    const {
        apiHost, // --api-host
        token, // --agent-token
        agentId, // --agnetId
        kubeContextName, // kube-context-name
        kubeNamespace, // --kube-namespace
        dryRun, // --dryRun
        inCluster, // -inCluster
        kubernetesRunnerType, // --kubernetes-runner-type
        kubeConfigPath, // --kube-config-path
        verbose, // --verbose
        name, // --runtimeEnvironmentName
    } = info;

    fs.chmodSync(filePath, '755');
    const commands = [
        'install',
        'runtime',
        '--agentId',
        agentId,
        '--agentToken',
        token,
        '--api-host',
        apiHost,
        '--kube-context-name',
        kubeContextName,
        '--kube-namespace',
        kubeNamespace,
    ];

    if (dryRun) {
        commands.push('--dryRun');
    }
    if (inCluster) {
        commands.push('--inCluster');
    }
    if (kubernetesRunnerType) {
        commands.push(`--kubernetes-runner-type=${kubernetesRunnerType}`);
    }
    if (kubeConfigPath) {
        commands.push(`--kube-config-path=${kubeConfigPath}`);
    }
    if (verbose) {
        commands.push('--verbose');
    }

    if (name) {
        commands.push('--runtimeName');
        commands.push(name);
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

const _attachRuntimeScript = (info, filePath) => {
    const {
        kubeContextName, // kube-context-name
        kubeNamespace, // --kube-namespace
        kubeConfigPath, // --kube-config-path
        serviceAccount, // --serviceAcount
        agentKubeContextName, // --kube-context-name-agent
        agentKubeNamespace, // --kube-namespace-agent
        agentKubeConfigPath, // --kube-config-path-agent

        verbose, // --verbose
        runtimeName, // --runtimeName
    } = info;

    fs.chmodSync(filePath, '755');
    const commands = [
        'attach',
        '--kube-context-name',
        kubeContextName,
        '--kube-namespace',
        kubeNamespace,
        '--runtimeName',
        runtimeName,

    ];

    if (kubeConfigPath) {
        commands.push(`--kube-config-path=${kubeConfigPath}`);
    }
    if (serviceAccount) {
        commands.push(`--serviceAcount=${serviceAccount}`);
    }
    if (agentKubeContextName) {
        commands.push(`--kube-context-name-agent=${agentKubeContextName}`);
    }
    if (agentKubeNamespace) {
        commands.push(`--kube-namespace-agent=${agentKubeNamespace}`);
    }
    if (agentKubeConfigPath) {
        commands.push(`--kube-config-path-agent=${agentKubeConfigPath}`);
    }
    if (verbose) {
        commands.push('--verbose');
    }

    const attachScript = spawn(filePath, commands);
    attachScript.stdout.pipe(process.stdout);
    attachScript.stderr.pipe(process.stderr);
    process.stdin.pipe(attachScript.stdin);
    return new Promise((resolve) => {
        attachScript.on('exit', (code) => {
            resolve(code);
        });
    });
};

class Runtimes extends Resource {
    async install(info) {
        const filePath = await this.getFilePath();
        const { terminateProcess } = info;
        const exitCode = await _installRuntimeScript(info, filePath, terminateProcess);
        if (terminateProcess) {
            process.exit(exitCode);
        }
    }

    async attach(info) {
        const filePath = await this.getFilePath();
        const { terminateProcess } = info;
        const exitCode = await _attachRuntimeScript(info, filePath, terminateProcess);
        if (terminateProcess) {
            process.exit(exitCode);
        }
    }

    async getFilePath() {
        const filePath = await prepareSpwan({ name: 'agent', repoName: 'venona', pathName: 'venonactl' });
        return filePath;
    }
}

module.exports = Runtimes;
