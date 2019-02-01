const Codefresh = require('../index');

const config = {
    apiKey: '',
    url: 'http://local.codefresh.io',
    spec: '',
};

// create with config
const sdk = Codefresh(config);


const main = async () => {
    const pipelines = await sdk.pipelines.getAll(/* some filter params may be here */);
};

main();
