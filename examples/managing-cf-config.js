const { Config } = require('../index');

async function main() {
    // use config manager for manipulating .cfconfig
    const manager = Config.manager();


    if (!manager.isConfigLoaded()) {
        // load from default path: $HOME/.cfconfig
        await manager.loadConfig();

        // load from specific path: $HOME/.cfconfig
        await manager.loadConfig('some/path/.cfconfig');

        // second time config is loaded from cache if path didn't change
        await manager.loadConfig('some/path/.cfconfig');

        // or you can force load config
        await manager.loadConfig('some/path/.cfconfig', true);
    }


    // creating context
    const context = await manager.createContext('API_KEY', 'http://local.codefresh.io', 'test');
    manager.addContext(context);
    await manager.persistConfig();


    // setting current context
    manager.setCurrentContext(context);
    await manager.persistConfig();


    // use context
    manager.useContext('test');
    await manager.persistConfig();


    // remove context
    manager.removeContext('test');
    await manager.persistConfig();


    // clear config
    manager.clearConfig();
    await manager.persistConfig();
}

main().then().catch((reason) => {
    console.error(reason);
});
