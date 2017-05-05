const tape = require('tape');
const index = require('../index');

tape('index tests', (test) => {
  test.test('', (t) => {
    t.equals(typeof index.service, 'function');
    t.equals(index.service.length, 1);
    t.equals(typeof index.ServiceConfiguration, 'function');
    t.end();
  });
});
