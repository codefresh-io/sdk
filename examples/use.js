const Codefresh = require('../index');

const swaggerSpec = require('./openapi');

async function use() {
    const sdk = Codefresh();
    sdk.configure({
        url: 'http://local.sdk.io',
        spec: swaggerSpec,
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

    // logic operations
    const boards = await sdk.helm.sections.getAll();
    console.log(boards);
    // await sdk.logs.showWorkflowLogs('5c5038d2d5a10276db017373');
    // await sdk.workflows.waitForStatus('asdf', 'success', moment().add(30, 'seconds'));
}

use().then().catch(reason => {
    console.error(reason)
});
