const _ = require('lodash');
const { Codefresh } = require('../index');

jest.mock('fs', () => ({
    readdirSync: () => [
        'clusters.logic.js',
        'workflows.logic.js',
    ],
    readFile: () => ({}),
    writeFile: () => ({}),
    mkdir: () => ({}),
}));

jest.mock('../lib/logic/clusters.logic.js');
jest.mock('../lib/logic/workflows.logic.js');


const swaggerApis = {
    clusters: { clusters_list: () => ({}) },
    workflows: { workflows_list: () => ({}) },
};

const spec = {
    paths: {
        '/workflows': {
            get: {
                operationId: 'workflows_list',
                'x-sdk-interface': 'workflows.list',
            },
        },
        '/clusters': {
            get: {
                operationId: 'clusters_list',
                'x-sdk-interface': 'clusters.list',
            },
        },
    },
};


describe('Sdk', () => {
    describe('loading', () => {
        it('should load Sdk from logic and api spec', () => {
            const sdk = new Codefresh({
                swagger: {
                    spec,
                    apis: swaggerApis,
                },
                options: { spec: { json: spec } },
            });

            expect(_.isFunction(_.get(sdk, 'workflows.get'))).toBeTruthy();
            expect(_.isFunction(_.get(sdk, 'workflows.list'))).toBeTruthy();
            expect(_.isFunction(_.get(sdk, 'clusters.get'))).toBeTruthy();
            expect(_.isFunction(_.get(sdk, 'clusters.list'))).toBeTruthy();
        });
    });
});
