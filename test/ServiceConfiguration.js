const tape = require('tape');
const ServiceConfiguration = require('../ServiceConfiguration');

tape('ServiceConfiguration tests', (test) => {
  test.test('timeout and retries overrides should be returned by getters', (t) => {
    const configBlob = {
      url: 'base url',
      timeout: 17,
      retries: 19
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.equals(serviceConfiguration.getName(), 'service name');
    t.equals(serviceConfiguration.getBaseUrl(), 'base url');
    t.deepEquals(serviceConfiguration.getParameters(), {});
    t.deepEquals(serviceConfiguration.getHeaders(), {});
    t.equals(serviceConfiguration.getUrl(), 'base url');
    t.equals(serviceConfiguration.getRetries(), 19);
    t.equals(serviceConfiguration.getTimeout(), 17);
    t.end();

  });

  test.test('configBlob w/o timeout or retries should default to 250 and 3, respectively', (t) => {
    const configBlob = {
      url: 'base url'
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.equals(serviceConfiguration.getTimeout(), 250, 'should be a default of 250');
    t.equals(serviceConfiguration.getRetries(), 3, 'should be a default of 3');
    t.end();

  });

  test.test('missing name should throw error', (t) => {
    t.throws(() => {
      // lint complains if using `new` and not assigning to something
      const config = new ServiceConfiguration(undefined, { url: 'base url' });
    }, /^name is required$/);
    t.end();

  });

  test.test('isEnabled should return false when baseUrl is undefined', (t) => {
    const configBlob = {};

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.notOk(serviceConfiguration.isEnabled());
    t.end();

  });

  test.test('isEnabled should return false when baseUrl is an empty string', (t) => {
    const configBlob = {
      url: ''
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.notOk(serviceConfiguration.isEnabled());
    t.end();

  });

  test.test('isEnabled should return true when baseUrl is a non-empty string', (t) => {
    const configBlob = {
      url: 'a'
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.ok(serviceConfiguration.isEnabled());
    t.end();

  });

});
