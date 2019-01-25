# Codefresh-sdk

Codefresh SDK built on openapi spec.

## Install
For now it's local only:

`yarn add /path/to/repo`

`npm i /path/to/repo`

## Usage

### Configure

```ecmascript 6
const Codefresh = require('codefresh-sdk');

// create with config
let sdk = Codefresh(config);

// or configure it later
sdk = Codefresh();
sdk.configure(config);
```

### Configuration Properties

Sdk requires `apiKey` to authenticate it's requests. Sdk client can be generated either from 
provided openapi spec or from spec using `specUrl`.

```ecmascript 6
sdk.configure({
    apiKey: {{CODEFRESH_API_KEY}}, // api key to authenticate sdk [required]
    url: {{CODEFRESH_URL}}, // url for which sdk is used (default: https://g.codefresh.io)
    spec: {{OPEN_API_SPEC_JSON}}, // spec json for generating sdk
    specUrl: {{OPEN_API_SPEC_URL}} // URL to fetch spec from (default: https://g.codefresh.io/api/swagger.json)
})
```

### Basic usage

Every sdk operation is built corresponding openapi spec: 

`sdk.<tag>.<operationId>({<parameters>}, {requestBody: <body>})`

For example, getting pipelines can be made in such way:

```ecmascript 6
const pipelines = sdk.pipelines.getAll(/* some filter params may be here */);
const pip = sdk.pipelines.get({ name: 'some-pip' }); // get one by name
```

Creating pipeline:

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
             title: "Running linting logic",
             image: "codefresh/node-tester-image:8.8.0",
             commands: ["yarn eslint"]
            }
        }
    }
}

sdk.pipelines.create({/* no params here */}, {requestBody: data});
```
