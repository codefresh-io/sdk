const Codefresh = require('../index');

const main = async () => {
    const sdk = Codefresh();
    sdk.configure({
        apiKey: process.env.CF_API_KEY,
    });

    const pipelines = await sdk.pipelines.list(/* some filter params may be here */);
    console.log(JSON.stringify(pipelines, 4, 2));
};

main();
