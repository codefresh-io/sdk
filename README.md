# Codefresh-Sdk

Codefresh SDK built on openapi spec.

## Install

`yarn add codefresh-sdk`

`npm install codefresh-sdk`

## Initialize

```ecmascript 6
const { Codefresh, Config } = require('codefresh-sdk');

// configure at creation phase
let sdk = new Codefresh(await Config.load());

// or postpone
sdk = new Codefresh();
const config = await Config.load();
sdk.configure(config);
```

## Configure

Sdk requires `apiKey` to authenticate its requests. 

#### Configuring from `.cfconfig`

```ecmascript 6
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

```

#### Configuring using Config.load()

##### Loading flow:
 
 1) if `options.apiKey` is provided (`options.url` is also available) - create config from it
 2) else if `$CF_API_KEY` variable has apiKey - create config from it
 3) else if `options.configPath` or `$CFCONFIG` is specified - load config from this path (same as `Config.fromCodefreshConfig()`)
 4) otherwise load config from default path (same as `Config.fromCodefreshConfig()`)

##### Examples:

```ecmascript 6
// 1) from credentials
sdk.configure(await Config.load({
    url: 'http://local.codefresh.io',
    apiKey: 'API_KEY',
}));


// 2) from env
process.env.CF_API_KEY = 'API_KEY';
sdk.configure(await Config.load());


// 3) load from specific path, using 'current-context'
// same as Config.fromCodefreshConfig()
sdk.configure(await Config.load({ configPath: 'some/path/.cfconfig' }));


// 3) load from specific path and specific context
// same as Config.fromCodefreshConfig()
sdk.configure(await Config.load({ configPath: 'some/path/.cfconfig', context: 'local' }));


// 3) load from path specified at $CFCONFIG, using 'current-context'
// same as Config.fromCodefreshConfig()
process.env.CFCONFIG = 'some/path/.cfconfig';
sdk.configure(await Config.load());


// 4) load from default path and specific context
// same as Config.fromCodefreshConfig()
// default path: $HOME/.cfconfig
sdk.configure(await Config.load({ context: 'local' }));
```

#### Config options

```ecmascript 6
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
```

#### Manipulate `.cfconfig` file

```ecmascript 6
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
```

## Naming Conventions

Every sdk operation retrieves it's interface from `openapi.json` spec using `x-sdk-interface` field 
(see the [docs](https://g.codefresh.io/api))

#### Interface templates:

```
// template
sdk.<resource>.<operation>()

// example
sdk.images.list()
```


```
// template
sdk.<resource>.[<sub-resource>...].<operation>()

// example
sdk.helm.boards.list()
sdk.helm.repos.create(body)
sdk.triggers.events.get({ event })
```


```
// template
sdk.<resource>.<operation>({ <params> })

// examples
sdk.workflows.get({ id })
sdk.workflows.list({ limit, page, status, trigger, pipeline })
```


```
// template
sdk.<resource>.<operation>(body)

// examples
sdk.compositions.create(body)
```


```
// template
sdk.<resource>.<operation>({ <params> }, body)

// examples
sdk.repos.create({ context }, body)
sdk.triggers.create({ event, pipeline }, body)
```


#### Standard for CRUD operations:

1) `create` - example: `sdk.pipelines.create(body)`
2) `get` - example: `sdk.pipelines.get({ name })`
3) `list` - example: `sdk.pipelines.list()`
4) `update` - example: `sdk.pipelines.update({ name }, body)`
5) `patch` - example: `sdk.helm.sections.patch({ id }, body)`
6) `delete` - example: `sdk.pipelines.create(body)`


## Examples

##### Getting pipelines:

```ecmascript 6
// get list by filter
const pipelines = sdk.pipelines.list({ label: 'some-label' });

// get one by name
const pip = sdk.pipelines.get({ name: 'some-pip' }); 
```

##### Creating pipelines:

```ecmascript 6
const data = {
    version: "1.0",
    kind: "pipeline",
    metadata: {
        name: "test"
    },
    spec: {
        steps: {
            eslint: {
                title: "Do something...",
                image: "node:alpine",
                commands: ["node -v"]
            }
        }
    }
};

sdk.pipelines.create(data);
```

##### Updating pipelines:

```ecmascript 6
const data = { /* same data */ };
sdk.pipelines.update({ name: 'some-pip' }, data);
```

##### Running pipelines:

```ecmascript 6
const data = {
    branch: 'master',
    sha: '192993440506679',
    variables: {
        SOME_VAR: 'some-var'
    },
    options: {
        noCache: true,
        resetVolume: true
    }
};

sdk.pipelines.run({ name: 'some-pip' }, data);
```
