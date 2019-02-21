const { Codefresh, Config } = require('../index');

const main = async () => {
    const sdk = new Codefresh(await Config.load());

    const pipelines = await sdk.pipelines.list({ limit: 10 });
    const pipeline = pipelines.docs[0];
    const workflowId = await sdk.pipelines.run({ name: pipeline.metadata.name }, { branch: 'master' });
    await sdk.logs.showWorkflowLogs(workflowId, true);
};

main();
