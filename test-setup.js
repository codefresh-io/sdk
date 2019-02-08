const _ = require('lodash');

function getCalls(mock) {
    return _.get(mock, 'mock.calls');
}

function getCallsCount(mock) {
    return _.get(mock, 'mock.calls.length');
}

function getLastCallArgs(mock) {
    return _.last(getCalls(mock));
}

class NotThrownError extends Error {
}

async function expectThrows(func, ExpectedError) {
    try {
        await func();
        throw new NotThrownError('Expected error not thrown!');
    } catch (e) {
        if (e instanceof NotThrownError) {
            throw e;
        }
        if (ExpectedError && !(e instanceof ExpectedError)) {
            throw e;
        }
        console.log('Error thrown: ', e.message);
        return e;
    }
}

global.getCalls = getCalls;
global.getCallsCount = getCallsCount;
global.getLastCallArgs = getLastCallArgs;
global.expectThrows = expectThrows;
