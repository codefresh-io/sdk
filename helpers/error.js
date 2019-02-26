const CFError = require('cf-errors');
const _ = require('lodash');

function _makeResponseError(response) {
    return new CFError({
        statusCode: response.statusCode,
        message: JSON.stringify(response.body || response),
    });
}

function handleErrors(response) {
    const { statusCode } = response;

    // if for some reason request was not properly redirected (when "Location" header is lost, not usual case)
    if (statusCode >= 300 && statusCode < 400) {
        throw new CFError({
            cause: _makeResponseError(response),
            message: 'Request was not properly redirected',
        });
    }
    if (statusCode === 401) {
        throw new CFError({
            cause: _makeResponseError(response),
            message: 'Please create or update your authentication context',
        });
    }
    if (statusCode === 403) {
        throw new CFError({
            cause: _makeResponseError(response),
            message: 'You do not have permissions to perform this action',
        });
    }

    // other status codes
    if (statusCode >= 400 && statusCode < 600) {
        if (_.get(response, 'body.message')) {
            if (_.get(response, 'body.error')) {
                throw new CFError(`message: ${response.body.message}\nerror: ${response.body.error}`);
            } else {
                throw new CFError(response.body.message);
            }
        } else {
            throw _makeResponseError(response);
        }
    }
}

/* eslint-disable */
module.exports = {
    handleErrors,
};
