const _ = require('lodash');
const debug = require('debug')('codefresh:sdk:auth:whoami');

const { Http } = require('../../../helpers/http');

const http = Http({
    timeout: 2000,
    retryStrategy: () => false,
});

const whoami = async (context) => {
    debug(`context is ${context} for ${context.name}`);
    const userOptions = {
        url: `${context.url}/api/user`,
        method: 'GET',
    };

    const user = await http(_.merge(userOptions, context.prepareHttpOptions()));
    const accounts = _.get(user, 'account', {});
    const accountInfo = _.chain(accounts)
        .filter(account => account.name === user.activeAccountName)
        .get('[0]', {})
        .pick('name', 'runtimeEnvironment')
        .value();

    debug(`account info ${JSON.stringify(accountInfo)}`);
    debug(`current account name is : ${JSON.stringify(_.get(user, 'activeAccountName'))}`);

    return accountInfo;
};

module.exports = { whoami };