const debug = require('debug')('codefresh:sdk:api:logs');
const uniqId = require('uniqid');
const Promise = require('bluebird');
const _ = require('lodash');
const CFError = require('cf-errors'); // eslint-disable-line
const Firebase = require('firebase');
const rp = require('request-promise');
const { CfReceiverService } = require('@codefresh-io/cf-receiver');

const _connectToFirebase = async firebaseAuth => new Promise((resolve, reject) => {
    const jobIdRef = new Firebase(firebaseAuth.url);
    jobIdRef.authWithCustomToken(firebaseAuth.accessToken, (err) => {
        if (err) {
            reject(new CFError({
                cause: err,
                message: 'Failed to login to Firebase',
            }));
        } else {
            debug('Firebase login succeeded');
            resolve();
        }
    });
});

function _printStepBeginning(stepName) {
    const prefixSuffix = Array(stepName.length)
        .join('=');
    console.log(`${prefixSuffix}\nStep: ${stepName}\n${prefixSuffix}`);
}

function _printStepLog(log) {
    process.stdout.write(log);
}

const _printLogsFromJson = (steps) => {
    _.forEach(_.sortBy(steps, 'creationTimeStamp'), (step) => {
        _printStepBeginning(step.name);
        _.forEach(step.logs, _printStepLog);
    });
};

const _getFinalFirebaseUrl = (firebaseAuth) => {
    if (firebaseAuth.newStructure) {
        return firebaseAuth.url;
    }

    return `${firebaseAuth.url}/build-logs`;
};

const _printCurrentFirebaseLogs = async (firebaseAuth, progressJobId) => new Promise((resolve, reject) => {
    const jobIdRef = new Firebase(`${_getFinalFirebaseUrl(firebaseAuth)}/${progressJobId}`);
    jobIdRef.once('value', (snapshot) => {
        const { steps } = snapshot.val();
        _printLogsFromJson(steps);
        resolve();
    }, (err) => {
        reject(new CFError({
            cause: err,
            message: 'Failed to get logs from firebase',
        }));
    });
});

function _isBuildFinished(status) {
    return ['success', 'error', 'terminated'].includes(status);
}

const _printFollowFirebaseLogs = async (firebaseAuth, progressJobId) => new Promise((resolve, reject) => {
    const jobIdRef = new Firebase(`${_getFinalFirebaseUrl(firebaseAuth)}/${progressJobId}`);

    const errorCallback = (err) => {
        reject(new CFError({
            cause: err,
            message: 'Failed to get logs from firebase',
        }));
    };

    jobIdRef.child('status')
        .on('value', (snapshot) => {
            const status = snapshot.val();
            if (_isBuildFinished(status)) {
                resolve();
            }
        }, errorCallback);

    jobIdRef.child('steps')
        .on('child_added', (snapshot) => {
            const step = snapshot.val();
            if (step.name) {
                const prefixSuffix = Array(step.name.length).join('=');
                console.log(`${prefixSuffix}\nStep: ${step.name}\n${prefixSuffix}`);
            } else {
                console.log(step);
            }
            step.ref = snapshot.ref();
            step.ref.child('logs')
                .on('child_added', (snapshot) => { // eslint-disable-line
                    const log = snapshot.val();
                    process.stdout.write(log);
                }, errorCallback);
        }, errorCallback);
});

const showWorkflowLogsFromFirebase = async (progressJobId, follow, sdk) => {
    const firebaseAuth = await sdk.firebase.getToken({ progressId: progressJobId });
    await _connectToFirebase(firebaseAuth);
    if (follow) {
        await _printFollowFirebaseLogs(firebaseAuth, progressJobId);
    } else {
        await _printCurrentFirebaseLogs(firebaseAuth, progressJobId);
    }
};

// when bringing logs from gcs, there is no meaning for workflow since the workflow has finished
const showWorkflowLogsFromGCS = async (progressJob) => {
    const options = {
        url: progressJob.location.url,
        method: 'GET',
        json: true,
    };

    const { steps } = await rp(options);
    _printLogsFromJson(steps);
};

function _prepareWsStepsLogsForPrint(steps) {
    const result = {};
    // sorting logs by time
    Object.keys(steps).forEach(name => Object.assign(steps[name], { name, logs: _.sortBy(steps[name].logs, 'time') }));
    // sorting steps by time
    _.sortBy(Object.values(steps), step => _.get(step, 'logs[0].time'))
        .forEach((step) => {
            const logs = {};
            // changing logs to 'common' cf format
            step.logs.forEach(log => Object.assign(logs, { [uniqId()]: log.payload }));
            Object.assign(step, { logs });
            Object.assign(result, { [step.name]: step });
        });
    return result;
}

function _initReceiver({ accountId, progressJobId, sdk }) {
    const { url, token } = sdk.config.context;
    let wsPath = url.replace('http://', '').replace('https://', '');
    if (url.startsWith('https://')) {
        wsPath = `wss://${wsPath}`;
    } else {
        wsPath = `ws://${wsPath}`;
    }
    return new CfReceiverService({
        endPoint: `${wsPath}/ws`,
        reconnectDelay: 5000,
        workflowID: `${accountId}/${progressJobId}?authorization=${token}`,
    });
}

function _setMessageToResult(result, msg) {
    const items = _.get(result, msg.slot, []);
    items.push(msg);
    _.set(result, msg.slot, items);
}

function _printCurrentWsLogs(receiver) {
    return new Promise((resolve, reject) => {
        const result = { steps: {} };
        receiver.watch().subscribe((res) => {
            try {
                if (res.type === 'message') {
                    const msg = JSON.parse(res.event.data);
                    if (_.get(msg, 'slot')) {
                        if (msg.slot === 'keepAlive') {
                            resolve(result);
                        }
                        _setMessageToResult(result, msg);
                    }
                }
                return null;
            } catch (error) {
                return reject(error);
            }
        });
    }).then(({ steps }) => {
        _printLogsFromJson(_prepareWsStepsLogsForPrint(steps));
        return receiver.close();
    }).catch((err) => {
        receiver.close();
        throw new CFError({
            cause: err,
            message: 'Failed to get current ws logs',
        });
    });
}

function _printMessageQueue(messageQueue) {
    const result = { steps: {} };
    messageQueue.forEach(msg => _setMessageToResult(result, msg));
    _printLogsFromJson(_prepareWsStepsLogsForPrint(result.steps));
    // return printed steps, for avoid duplication step beginning logs
    return Object.keys(result.steps);
}

function _printFollowWsLogs(receiver) {
    return new Promise((resolve, reject) => {
        let allSavedLogsReceived = false;
        const printedSteps = [];
        const messageQueue = [];
        receiver.watch().subscribe((res) => {
            try {
                if (res.type === 'message') {
                    const msg = JSON.parse(res.event.data);
                    if (_.get(msg, 'slot')) {
                        const [itemName, stepName, stepItem] = msg.slot.split('.');
                        if (itemName === 'steps' && stepItem === 'logs') {
                            if (!['e', 's'].includes(msg.action)) {
                                return null;
                            }
                            // check or we got all saved logs
                            if (!allSavedLogsReceived) {
                                messageQueue.push(msg);
                                const actions = _.map(messageQueue, 'action');
                                // if last 3 logs is not from the past, print queue and go to normal follow mode
                                const uniqActions = _.uniq(actions.slice(actions.length - 3));
                                if (uniqActions[0] === 'e' && uniqActions.length === 1) {
                                    allSavedLogsReceived = true;
                                    printedSteps.push(..._printMessageQueue(messageQueue));
                                }
                                return null;
                            }
                            if (!printedSteps.includes(stepName)) {
                                printedSteps.push(stepName);
                                _printStepBeginning(stepName);
                            }
                            _printStepLog(msg.payload);
                        }
                    }

                    // send message for checking status of build
                    if (msg.slot === 'keepAlive') {
                        receiver.send(
                            JSON.stringify({
                                msgID: 'getStatus',
                                action: 'getStatus',
                            }),
                        );
                    }

                    if (msg.slot === 'status') {
                        if (_isBuildFinished(msg.payload)) {
                            return resolve();
                        }
                    }

                    if (msg.msgID === 'getStatus') {
                        if (_isBuildFinished(_.get(msg, 'payload.meta.status')) || _.isNull(msg.payload)) {
                            return resolve();
                        }
                    }
                }
                return null;
            } catch (error) {
                return reject(error);
            }
        });
    })
        .then(() => receiver.close())
        .catch((err) => {
            receiver.close();
            throw new CFError({
                cause: err,
                message: 'Failed to get current ws logs',
            });
        });
}

const showWorkflowLogsByWebsocket = async (progressJobId, accountId, follow, sdk) => {
    const receiver = _initReceiver({ accountId, progressJobId, sdk });
    if (follow) {
        await _printFollowWsLogs(receiver);
    } else {
        await _printCurrentWsLogs(receiver);
    }
};

module.exports = {
    showWorkflowLogsFromFirebase,
    showWorkflowLogsFromGCS,
    showWorkflowLogsByWebsocket,
};
