const Client = require('../lib/Client');

describe('Client', () => {
    describe('loading', () => {
        it('should throw on swagger missing', async () => {
            expect(() => {
                new Client({ config: {} }); // eslint-disable-line
            }).toThrow();
        });

        it('should throw on spec missing', async () => {
            expect(() => {
                new Client({ config: { swagger: {} } }); // eslint-disable-line
            }).toThrow();
        });
    });
});
