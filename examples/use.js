const { Codefresh, Config } = require('../index');

async function use() {
    const config = await Config.autoDetect({
        configPath: 'asdf/asdf/asdf',
        // url: 'http://local.codefresh.io',
        // spec: { url: 'http://local.codefresh.io/api/openapi.json' },
        // apiKey: process.env.CF_API_KEY,
        // apiKey: process.env.CF_JWT_TOKEN,
        apiKeyEnv: 'asdf',
    });

    const sdk = Codefresh();
    sdk.configure(config);

    // creating context
    const manager = sdk.config.manager();
    const context = await manager.createContext(process.env.CF_API_KEY, 'http://local.codefresh.io', 'test');
    manager.setCurrentContext(context);
    await manager.persistConfig();

    // need to reconfigure
    sdk.configure(await config.recreate());

    const boards = await sdk.helm.boards.list();
    console.log(boards);

    // await sdk.logs.showWorkflowLogs('5c5038d2d5a10276db017373');
    // await sdk.workflows.waitForStatus('asdf', 'success', moment().add(30, 'seconds'));
}

use().then().catch(reason => {
    console.error(reason)
});
