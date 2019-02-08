const _ = require('lodash');
const util = require('util');

const { postProcessApi, resourceProxy } = require('../helpers/api');


describe('api helper', () => {
    describe('resourceProxy', () => {
        const logicResult = 'logic result';
        const clientResult = 'client result';
        const logicResource = () => logicResult;
        const pipelinesResource = 'pipelines';
        const clientHandler = jest.fn(() => clientResult);
        const logicHandler = jest.fn((path) => {
            if (path === `${pipelinesResource}.customLogic`) {
                return logicResource;
            }
            return undefined;
        });

        beforeEach(() => {
            clientHandler.mockClear();
            logicHandler.mockClear();
        });

        it('should return logic resource when logic handler resolves path', () => {
            const pipelines = resourceProxy(clientHandler, logicHandler, pipelinesResource);

            const handler = pipelines.customLogic;

            expect(getCallsCount(logicHandler)).toBe(1); // eslint-disable-line
            expect(getCallsCount(clientHandler)).toBe(0); // eslint-disable-line

            expect(_.first(getLastCallArgs(logicHandler))).toBe(`${pipelinesResource}.customLogic`); // eslint-disable-line
            expect(handler).toBe(logicResource);
        });

        it('should call logic handler and if it does not resolve path then call client', () => {
            const pipelines = resourceProxy(clientHandler, logicHandler, pipelinesResource);

            const handler = pipelines.getAll;

            const result = handler();
            expect(handler).not.toBe(logicResource);
            expect(result).toBe(clientResult);

            // both were called
            expect(getCallsCount(logicHandler)).toBe(1); // eslint-disable-line
            expect(getCallsCount(clientHandler)).toBe(1); // eslint-disable-line

            // both got same path to resolve
            expect(_.first(getLastCallArgs(logicHandler))).toBe(`${pipelinesResource}.getAll`); // eslint-disable-line
            expect(_.first(getLastCallArgs(clientHandler))).toBe(`${pipelinesResource}.getAll`); // eslint-disable-line
        });

        it('should not call client handler on resolution phase but call when proxy is called', () => {
            const pipelines = resourceProxy(clientHandler, logicHandler, pipelinesResource);

            const handler = pipelines.getAll; // proxy here

            expect(getCallsCount(clientHandler)).toBe(0); // eslint-disable-line
            expect(util.types.isProxy(handler)).toBe(true); // eslint-disable-line

            const result = handler(); // client handler called with full path

            expect(result).toBe(clientResult);
            expect(getCallsCount(clientHandler)).toBe(1); // eslint-disable-line
            expect(_.first(getLastCallArgs(clientHandler))).toBe(`${pipelinesResource}.getAll`); // eslint-disable-line
        });

        it('should return new resource proxy on every nested path', () => {
            const pipelines = resourceProxy(clientHandler, logicHandler, pipelinesResource);

            const proxy1 = pipelines.one;
            const proxy2 = pipelines.one.two;
            const proxy3 = pipelines.one.two.three;

            expect(util.types.isProxy(proxy1)).toBe(true);
            expect(util.types.isProxy(proxy2)).toBe(true);
            expect(util.types.isProxy(proxy3)).toBe(true);

            expect(proxy1).not.toBe(proxy2);
            expect(proxy2).not.toBe(proxy3);
        });

        it('should cache child resource proxies on repeated paths', () => {
            const pipelines = resourceProxy(clientHandler, logicHandler, pipelinesResource);

            expect(pipelines.one).toBe(pipelines.one);
            expect(pipelines.one.two).toBe(pipelines.one.two);
            expect(pipelines.one.two.three).toBe(pipelines.one.two.three);
        });
    });

    describe('postProcessApi', () => {
        it('should transform swagger apis into sdk regarding "x-sdk-interface" field', () => {
            const originalSpec = {
                paths: {
                    '/pipeline': { get: { 'x-sdk-interface': 'pipeline.get' } },
                    '/workflow': { get: { 'x-sdk-interface': 'workflow.get' } },
                },
            };
            const swagger = {
                apis: {
                    pipeline: { pipeline_get: 'get pips' },
                    workflow: { workflow_get: 'get pips' },
                    not_found_resource: { not_found_resource: 'not_found_resource' },
                },
                spec: {
                    paths: {
                        '/pipeline': { get: { operationId: 'pipeline_get' } },
                        '/workflow': { get: { operationId: 'workflow_get' } },
                        '/not/found/resource': { get: { operationId: 'not_found_resource' } },
                    },
                },
            };
            const apis = {
                pipeline: { get: 'get pips' },
                workflow: { get: 'get pips' },
            };

            expect(postProcessApi(swagger, originalSpec)).toEqual(apis);
        });
    });
});
