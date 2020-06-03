const { spawn } = require('child_process');
const Resource = require('./Resource.base');
const prepareSpwan = require('./Spwan.helper');

const _installMonitorScript = async (info, filePath) => {
    const {
        clusterId,
        token,
        verbose,
        helm3,
        kubeContextName,
        kubeNamespace,
        codefreshHost,
        logFormatting,

    } = info;

    const commands = [
        'install',
        'monitor',
    ];

    if (clusterId) {
        commands.push('--clusterId');
        commands.push(clusterId);
    }

    if (token) {
        commands.push('--codefreshToken');
        commands.push(token);
    }

    if (kubeContextName) {
        commands.push('--kube-context-name');
        commands.push(kubeContextName);
    }

    if (helm3) {
        commands.push('--helm3');
    }

    if (kubeNamespace) {
        commands.push('--kube-namespace');
        commands.push(kubeNamespace);
    }

    if (codefreshHost) {
        commands.push('--codefreshHost');
        commands.push(codefreshHost);
    }
    if (verbose) {
        commands.push('--verbose');
    }
    if (logFormatting) {
        commands.push(`--log-formtter=${logFormatting}`);
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

const _unInstallMonitorScript = (info, filePath) => {
    const {
        kubeContextName, // kube-context-name
        kubeNamespace, // --kube-namespace
        kubeConfigPath, // --kube-config-path
        logFormatting, // --log-formtter
    } = info;

    const commands = [
        'uninstall',
        'monitor',
    ];

    if (kubeContextName) {
        commands.push(`--kube-context-name=${kubeContextName}`);
    }

    if (kubeNamespace) {
        commands.push(`--kube-namespace=${kubeNamespace}`);
    }

    if (kubeConfigPath) {
        commands.push(`--kube-config-path=${kubeConfigPath}`);
    }

    if (logFormatting) {
        commands.push(`--log-formtter=${logFormatting}`);
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

class MonitorLogic extends Resource {
    async install(info) {
        const filePath = await this.getFilePath();
        const { terminateProcess } = info;
        const exitCode = await _installMonitorScript(info, filePath, terminateProcess);
        if (terminateProcess) {
            process.exit(exitCode);
        }
        return exitCode;
    }

    async unInstall(info) {
        const { terminateProcess, events } = info;
        const filePath = await this.getFilePath(events);
        const exitCode = await _unInstallMonitorScript(info, filePath);
        if (terminateProcess) {
            process.exit(exitCode);
        }
        return exitCode;
    }

    getFilePath(events) {
        // eslint-disable-next-line max-len
        return prepareSpwan({ name: 'agent', repoName: 'venona', pathName: 'venonactl', branch: 'release-1.0', excludeVersionPrefix: true, events });
    }
}

module.exports = MonitorLogic;
