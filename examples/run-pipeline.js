const Codefresh = require('../index');

const main = async () => {
    const sdk = Codefresh();
    sdk.configure({
        apiKey: process.env.CF_API_KEY,
    });

    const pipelines = await sdk.pipelines.list({ limit: 10 });
    const pipeline = pipelines.docs[0];
    const workflowId = await sdk.pipelines.run({ name: pipeline.metadata.name }, { branch: 'master' });
    sdk.logs.showWorkflowLogs(workflowId, true);
};

main();
