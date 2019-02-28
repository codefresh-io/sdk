const { whoami } = require('../lib/auth/contexts/whoami');
const { APIKeyContext } = require('../lib/auth/contexts');
const { Http } = require('../helpers/http');

jest.mock('../helpers/http', () => {
    let response;
    let validateParams;

    const __setResponse = (x) => {
        response = x;
    };

    const __setValidateParams = (x) => {
        validateParams = x;
    };

    const __reset = () => {
        response = null;
        validateParams = null;
    };

    const http = (userOptions, context, flag) => {
        if (validateParams) {
            validateParams(userOptions, context, flag);
        }

        return response();
    };

    const HttpConstructor = () => http;

    HttpConstructor.__setResponse = __setResponse;
    HttpConstructor.__setValidateParams = __setValidateParams;
    HttpConstructor.__reset = __reset;

    return { Http: HttpConstructor };
});


describe('whoami', () => {
    beforeEach(() => {
        Http.__reset();
    });

    it('should return active account information in case context is valid', async () => {
        const testToken = 'test-token';
        const testUrl = 'http://test';
        const context = new APIKeyContext({
            name: 'test-context',
            url: testUrl,
            token: testToken,
        });

        Http.__setValidateParams((userOptions) => {
            expect(userOptions)
                .toEqual({
                    method: 'GET',
                    url: `${testUrl}/api/user`,
                    headers: { Authorization: testToken },
                });
        });

        const activeAccountName = 'account-name-1';
        const firstAccount = {
            name: activeAccountName,
            runtimeEnvironment: 'runtime-environment-1',
        };
        const secondAccount = {
            name: 'account-name-2',
            runtimeEnvironment: 'runtime-environment-2',
        };
        Http.__setResponse(() => ({
            activeAccountName,
            account: [
                firstAccount,
                secondAccount,
            ],
        }));

        const accountInfo = await whoami(context);
        expect(accountInfo).toEqual(firstAccount);
    });

    it('should return full account info when fullUser flag is specified', async () => {
        const context = new APIKeyContext({
            name: 'test-context',
            url: 'http://test',
            token: 'test-token',
        });

        const response = { test: 'test' };
        Http.__setResponse(() => response);

        const accountInfo = await whoami(context, true);
        expect(accountInfo).toEqual(response);
    });

    it('should return empty info when no data returned', async () => {
        const context = new APIKeyContext({
            name: 'test-context',
            url: 'http://test',
            token: 'test-token',
        });

        const response = { test: 'test' };
        Http.__setResponse(() => response);

        const accountInfo = await whoami(context);
        expect(accountInfo).toEqual({});
    });

    it('should fail in case context is not valid', async () => {
        const context = new APIKeyContext({
            name: 'test-context',
            url: 'http://test',
            token: 'test-token',
        });

        Http.__setResponse(() => {
            throw new Error('http request error');
        });

        await expect(whoami(context)).rejects.toThrow('http request error');
    });
});
