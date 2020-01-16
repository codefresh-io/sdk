
const fs = require('fs');
const { spawn } = require('child_process');
const Resource = require('./Resource.base');
const prepareSpwan = require('./Spwan.helper');


const _installVenonaScript = (info, filePath) => {
    const {
        kubeContextName, // kube-context-name
        kubeNamespace, // --kube-namespace
        kubeNodeSelector, // - kubeNodeSelector
        nodeSelector, // --kube-node-selector
        skipRuntime, // --skip-runtime-installation
        buildAnnotations, // --build-annotations
        buildNodeSelector, // --buildNodeSelector
        clusterName, // --cluster-name
        dryRun, // --dryRun
        inCluster, // -inCluster
        kubernetesRunnerType, // --kubernetes-runner-type
        onlyRuntimeEnvironment, // --only-runtime-environment
        runtimeEnvironment, // --runtime-environment
        setDefault, // --set-default
        skipRuntimeInstallation, // -- skip-runtime-installation
        storageClass, // --storage-class
        tolerations, // --tolerations
        venonaVersion, // --venona-version
        kubeConfigPath, // --kube-config-path
        skipVersionCheck, // --skip-version-check
        verbose, // --verbose
    } = info;
    fs.chmodSync(filePath, '755');
    const commands = [
        'install',
        '--kube-context-name',
        kubeContextName,
        '--kube-namespace',
        kubeNamespace,
    ];
    if (nodeSelector) {
        commands.push('--kube-node-selector');
        commands.push(nodeSelector);
    }

    if (skipRuntime) {
        commands.push('--skip-runtime-installation');
    }
    if (buildAnnotations) {
        commands.push(`--buildAnnotations=${buildAnnotations}`);
    }
    if (buildNodeSelector) {
        commands.push(`--build-node-selector=${buildNodeSelector}`);
    }
    if (clusterName) {
        commands.push(`--cluster-name=${clusterName}`);
    }
    if (dryRun) {
        commands.push('--dryRun');
    }
    if (inCluster) {
        commands.push('--inCluster');
    }
    if (kubeNodeSelector) {
        commands.push(`--kubeNodeSelector=${kubeNodeSelector}`);
    }
    if (kubernetesRunnerType) {
        commands.push(`--kubernetes-runner-type=${kubernetesRunnerType}`);
    }
    if (onlyRuntimeEnvironment) {
        commands.push(`--only-runtime-environment${onlyRuntimeEnvironment}`);
    }
    if (runtimeEnvironment) {
        commands.push(`--runtime-environment${runtimeEnvironment}`);
    }
    if (setDefault) {
        commands.push('--set-default');
    }
    if (skipRuntimeInstallation) {
        commands.push('--skip-runtime-installation');
    }
    if (storageClass) {
        commands.push(`--storage-class=${storageClass}`);
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

    const clusterScript = spawn(filePath, commands);
    clusterScript.stdout.pipe(process.stdout);
    clusterScript.stderr.pipe(process.stderr);
    process.stdin.pipe(clusterScript.stdin);
    clusterScript.on('exit', (code) => {
        process.exit(code);
    });
};

class Agents extends Resource {
    async install(info) {
        const filePath = await prepareSpwan({ name: 'agent', repoName: 'venona', pathName: 'venonactl' });
        _installVenonaScript(info, filePath);
    }
}

module.exports = Agents;
