const { Codefresh, Config } = require('../index');

async function usage() {
    // configure on creation phase
    let sdk = new Codefresh(await Config.load());

    // or postpone
    sdk = new Codefresh();
    const config = await Config.load();
    sdk.configure(config);

    /** ----------loading from .cfconfig---------- */

    // load from default path, using 'current-context'
    // default path: $HOME/.cfconfig
    sdk.configure(await Config.fromCodefreshConfig());


    // load from path specified at $CFCONFIG, using 'current-context'
    process.env.CFCONFIG = 'some/path/.cfconfig';
    sdk.configure(await Config.fromCodefreshConfig());


    // load from specific path, using 'current-context'
    sdk.configure(await Config.fromCodefreshConfig({ configPath: 'some/path/.cfconfig' }));


    // load from default path and specific context
    // throws if context does not exist
    sdk.configure(await Config.fromCodefreshConfig({ context: 'local' }));


    // load from specific path and specific context
    sdk.configure(await Config.fromCodefreshConfig({ configPath: 'some/path/.cfconfig', context: 'local' }));


    /** ----------loading using Config.load()---------- */
    /**
     * Loading flow:
     *
     * 1) if options.apiKey is provided (options.url is also available) - create config from it
     * 2) else if $CF_API_KEY variable has apiKey - create config from it
     * 3) else if options.configPath or $CFCONFIG is specified - load config from this path (same as Config.fromCodefreshConfig())
     * 4) otherwise load config from default path (same as Config.fromCodefreshConfig())
     * */


    // 1) from credentials
    sdk.configure(await Config.load({
        url: 'http://local.codefresh.io',
        apiKey: 'API_KEY',
    }));


    // 2) from env
    process.env.CF_API_KEY = 'API_KEY';
    sdk.configure(await Config.load());


    // 3) load from specific path, using 'current-context'
    sdk.configure(await Config.load({ configPath: 'some/path/.cfconfig' }));


    // 3) load from specific path and specific context
    sdk.configure(await Config.load({ configPath: 'some/path/.cfconfig', context: 'local' }));


    // 3) load from path specified at $CFCONFIG, using 'current-context'
    process.env.CFCONFIG = 'some/path/.cfconfig';
    sdk.configure(await Config.load());


    // 4) load from default path and specific context
    // default path: $HOME/.cfconfig
    sdk.configure(await Config.load({ context: 'local' }));


    /** ----------config options---------- */

    sdk.configure(await Config.load({
        url: 'http://g.codefresh.io', // when loading not from config file
        apiKey: 'API_KEY', // when loading not from config file
        spec: {
            json: '{ "openapi": "v3" .... }' || { openapi: 'v3' }, // openapi spec here
            url: 'http://not.codefresh.io/api/openapi.json', // or url to load (default: https://g.codefresh.io/api/openapi.json)
        },
        request: {
            timeout: 2000, // request timeout
            headers: { 'x-useful-header': 'some useful data' }, // some custom headers
        },
    }));
}

usage().then().catch((reason) => {
    console.error(reason);
});
