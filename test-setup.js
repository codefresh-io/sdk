
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

global.expectThrows = expectThrows;
