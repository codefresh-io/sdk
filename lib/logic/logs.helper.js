const debug = require('debug')('codefresh:sdk:api:logs');
const Promise = require('bluebird');
const _ = require('lodash');
const CFError = require('cf-errors'); // eslint-disable-line
const Firebase = require('firebase');
const rp = require('request-promise');

const _connectToFirebase = async (firebaseAuth) => {
    return new Promise((resolve, reject) => {
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
};

const _printLogsFromJson = (steps) => {
    _.forEach(steps, (step) => {
        const prefixSuffix = Array(step.name.length)
            .join('=');
        console.log(`${prefixSuffix}\nStep: ${step.name}\n${prefixSuffix}`);
        _.forEach(step.logs, (log) => {
            process.stdout.write(log);
        });
    });
};

const _printCurrentFirebaseLogs = async (firebaseAuth, progressJobId) => {
    return new Promise((resolve, reject) => {
        const jobIdRef = new Firebase(`${firebaseAuth.url}/build-logs/${progressJobId}`);
        jobIdRef.once('value', (snapshot) => {
            const {steps} = snapshot.val();
            _printLogsFromJson(steps);
            resolve();
        }, (err) => {
            reject(new CFError({
                cause: err,
                message: 'Failed to get logs from firebase',
            }));
        });
        Firebase.goOffline();
    });
};


const _printFollowFirebaseLogs = async (firebaseAuth, progressJobId) => {
    return new Promise((resolve, reject) => {
        const jobIdRef = new Firebase(`${firebaseAuth.url}/build-logs/${progressJobId}`);

        const errorCallback = (err) => {
            reject(new CFError({
                cause: err,
                message: 'Failed to get logs from firebase',
            }));
        };

        jobIdRef.child('status')
            .on('value', (snapshot) => {
                const status = snapshot.val();
                if (['success', 'error', 'terminated'].includes(status)) {
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
};

const showWorkflowLogsFromFirebase = async (progressJobId, follow, sdk) => {
    const firebaseAuth = await sdk.firebase.getToken();
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

    const {steps} = await rp(options);
    _printLogsFromJson(steps);
};


module.exports = {
    showWorkflowLogsFromFirebase,
    showWorkflowLogsFromGCS
};
