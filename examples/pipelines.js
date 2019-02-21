const { Codefresh, Config } = require('../index');

const main = async () => {
    const sdk = new Codefresh(await Config.load());

    // get list by filter
    const pipelines = await sdk.pipelines.list();
    console.log(pipelines.docs);

    // get one by name
    const pip = sdk.pipelines.get({ name: 'some-pip' });
    console.log(pip);

    // create
    const data = {
        version: '1.0',
        kind: 'pipeline',
        metadata: { name: 'test' },
        spec: {
            steps: {
                eslint: {
                    title: 'Do something...',
                    image: 'node:alpine',
                    commands: ['node -v'],
                },
            },
        },
    };
    await sdk.pipelines.create(data);

    // update
    await sdk.pipelines.update({ name: 'some-pip' }, data);
};

main();
