const Codefresh = require('../index');
const swaggerSpec = require('./openapi');

async function use() {
    const sdk = Codefresh();
    sdk.configure({
        url: 'http://local.codefresh.io',
        // spec: swaggerSpec,
        apiKey: process.env.CF_API_KEY,
    });

    // client operations
    // const pip = await sdk.pipelines.create(pipSpec);
    // console.log('pipeline created:', pip);
    // const pips = await sdk.pipelines.getAll();
    // console.log('pipelines:', pips);
    //
    // // destructuring
    // const {pipelines} = sdk;
    // console.log(await pipelines.getAll());
    // console.log(await pipelines.getAll());

    await sdk.contexts.create({ metadata: { name: 'test55' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test2' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test3' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test4' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test5' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test6' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test7' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test8' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test9' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test11' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test22' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test33' }, spec: { type: 'yaml', data: {} } });
    await sdk.contexts.create({ metadata: { name: 'test44' }, spec: { type: 'yaml', data: {} } });

    await sdk.contexts.delete({ name: 'test55' });
    await sdk.contexts.delete({ name: 'test2' });
    await sdk.contexts.delete({ name: 'test3' });
    await sdk.contexts.delete({ name: 'test4' });
    await sdk.contexts.delete({ name: 'test5' });
    await sdk.contexts.delete({ name: 'test6' });
    await sdk.contexts.delete({ name: 'test7' });
    await sdk.contexts.delete({ name: 'test8' });
    await sdk.contexts.delete({ name: 'test9' });
    await sdk.contexts.delete({ name: 'test11' });
    await sdk.contexts.delete({ name: 'test22' });
    await sdk.contexts.delete({ name: 'test33' });
    await sdk.contexts.delete({ name: 'test44' });

    // logic operations
    // const boards = await sdk.helm.sections.getAll();
    // console.log(boards);
    // await sdk.logs.showWorkflowLogs('5c5038d2d5a10276db017373');
    // await sdk.workflows.waitForStatus('asdf', 'success', moment().add(30, 'seconds'));
}

use().then().catch(reason => {
    console.error(reason)
});
