const debug = require('debug')('codefresh:sdk:helpers:context');
const _ = require('lodash');

const contexts = require('../lib/auth/contexts');
const { testJwt } = require('./jwt');

const { JWTContext, APIKeyContext } = contexts;


const createContext = async (apiKey, url, name) => {
    const Context = testJwt(apiKey) ? JWTContext : APIKeyContext;

    debug('creating: %o', { apiKey: `${apiKey && apiKey.substring(0, 10)}...`, url });
    const context = Context.createFromToken(apiKey, url);

    context.name = name || context.name;

    debug('validating...');
    const userData = await context.validate();

    const roles = _.get(userData, 'roles', []);
    context.onPrem = roles.includes('Admin');
    debug('user is onPrem:', context.onPrem);

    return context;
};

module.exports = { createContext };
