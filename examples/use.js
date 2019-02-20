const { Codefresh, Config } = require('../index');

// todo : add usage
async function use() {
    const sdk = new Codefresh();

    // just provide
    const config1 = await Config.load({
        url: 'http://local.codefresh.io',
        apiKey: process.env.CF_API_TOKEN,
    });

    // load from default or specific file with default or specific context
    const config2 = await Config.fromCodefreshConfig({ context: 'local' });

    // load from specific path and default context
    const config3 = await Config.fromCodefreshConfig({ configPath: 'local' });

    // load from specific path and specific context
    const config4 = await Config.fromCodefreshConfig({ configPath: 'local', context: 'local' });

    // 1) try to get apiKey and url from options
    // 2) if not - from env
    // 3) if not - from file
    const config5 = await Config.load();


    // creating context
    const manager = Config.manager();
    manager.loadConfig();
    const context = await manager.createContext(process.env.CF_API_TOKEN, 'http://local.codefresh.io', 'test');
    manager.setCurrentContext(context);
    await manager.persistConfig();


    sdk.configure(Config.load());
    await sdk.helm.boards.list();
}

use().then().catch((reason) => {
    console.error(reason);
});
