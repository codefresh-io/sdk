const Codefresh = require('../index');
const swaggerSpec = require('./openapi');

class LocalError extends Error {
    constructor(message) {
        super(message);
    }
}

jest.mock('requestretry', () => {
    const request = () => {
    };

    request.defaults = () => request;

    return request;
});

const sdk = Codefresh();
sdk.configure({
    url: 'http://not.needed',
    spec: swaggerSpec,
    apiKey: 'not-needed'
});

/**
 * for some reasons expect didn't work for me with async
 * */
async function expectThrow(func) {
    try {
        await func();
        throw new LocalError('error not thrown')
    } catch (e) {
        if (e instanceof LocalError) throw e;
        console.log('ok error:', e.message);
    }
}

describe('test', () => {
    it('should throw on required params missing', async () => {
        await expectThrow(async () => {
            await sdk.helm.boards.get(); // Required parameter id is not provided
        })
    });

    it('should throw on handler path missing', async () => {
        await expectThrow(async () => {
            await sdk.helmmm.boards.get(); // No handler for path: helmmm.boards.get
        })
    });
});
