const Codefresh = require('../index');
const moment = require('moment');

const swaggerSpec = require('./openapi');
const pipSpec = require('./pip-spec');

async function use() {
    const codefresh = Codefresh();
    codefresh.configure({
        url: 'http://local.codefresh.io',
        spec: swaggerSpec,
        apiKey: process.env.CF_API_KEY
    });

    // client operations
    // const pip = await codefresh.pipelines.create(pipSpec);
    // console.log('pipeline created:', pip);
    // const pips = await codefresh.pipelines.getAll();
    // console.log('pipelines:', pips);
    //
    // // destructuring
    // const {pipelines} = codefresh;
    // console.log(await pipelines.getAll());
    // console.log(await pipelines.getAll());

    // logic operations
    await codefresh.logs.showWorkflowLogs('5c5038d2d5a10276db017373');
    // await codefresh.workflows.waitForStatus('asdf', 'success', moment().add(30, 'seconds'));
}

use().then().catch(reason => {
    console.error(reason)
});
