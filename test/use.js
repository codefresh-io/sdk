const Codefresh = require('../index');

const swaggerSpec = require('./swagger');
const pipSpec = require('./pip-spec');

async function use() {
  const codefresh = Codefresh();
  codefresh.configure({
    url: 'http://local.codefresh.io',
    spec: swaggerSpec,
    apiKey: process.env.CF_API_KEY
  });

  // client operations
  const pip = await codefresh.pipelines.create({}, {requestBody: pipSpec});
  console.log('pipeline created:', pip);
  const pips = await codefresh.pipelines.getAll();
  console.log('pipelines:', pips);

  // destructuring
  const {pipelines} = codefresh;
  console.log(await pipelines.getAll());
  console.log(await pipelines.getAll());

  // logic operations
  codefresh.pipelines.dummyOperation();
}

use().then().catch(reason => {
  console.error(reason)
});
