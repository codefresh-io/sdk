const { Codefresh, Config } = require('../index');

async function use() {
    const sdk = Codefresh();

    // just provide
    let config = await Config.fromProvided({
        url: 'http://local.codefresh.io',
        apiKey: process.env.CF_API_TOKEN,
    });

    sdk.configure(config);
    await sdk.helm.boards.list();


    // load from default or specific env var
    // default: CF_URL and CF_API_KEY
    config = await Config.fromEnv({ apiKeyEnv: 'CF_API_TOKEN' });
    sdk.configure(config);
    await sdk.helm.boards.list();


    // load from default or specific file with default or specific context
    config = await Config.fromFile({ context: 'local' });
    sdk.configure(config);
    await sdk.helm.boards.list();


    // 1) try to get apiKey and url from options
    // 2) if not - from env
    // 3) if not - from file
    config = await Config.autoDetect();
    sdk.configure(config);
    await sdk.helm.boards.list();


    // creating context
    const manager = sdk.config.manager();
    const context = await manager.createContext(process.env.CF_API_TOKEN, 'http://local.codefresh.io', 'test');
    manager.setCurrentContext(context);
    await manager.persistConfig();

    // need to reconfigure
    sdk.configure(await config.recreate());

    await sdk.helm.boards.list();
}

use().then().catch((reason) => {
    console.error(reason);
});
