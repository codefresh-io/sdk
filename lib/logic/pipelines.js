// todo: remove
const dummyOperation = function () {
  console.log('Logic: pipelines.dummyOperation()');
  console.log('Logic: dummyOperation this:', this.constructor.name);
};

module.exports = {
  dummyOperation
};
