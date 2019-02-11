const tape = require('tape');
const ServiceConfiguration = require('../ServiceConfiguration');

tape('ServiceConfiguration tests', (test) => {
  test.test('timeout and retries overrides should be returned by getters', (t) => {
    const configBlob = {
      url: 'http://localhost:1234/',
      timeout: 17,
      retries: 19
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.equals(serviceConfiguration.getName(), 'service name');
    t.equals(serviceConfiguration.getBaseUrl(), 'http://localhost:1234/');
    t.deepEquals(serviceConfiguration.getParameters(), {});
    t.deepEquals(serviceConfiguration.getHeaders(), {});
    t.equals(serviceConfiguration.getUrl(), 'http://localhost:1234/');
    t.equals(serviceConfiguration.getRetries(), 19);
    t.equals(serviceConfiguration.getTimeout(), 17);
    t.end();

  });

  test.test('url not ending with / should append /', (t) => {
    const configBlob = {
      url: 'http://localhost:1234'
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.equals(serviceConfiguration.getBaseUrl(), 'http://localhost:1234/');
    t.end();

  });

  test.test('configBlob w/o timeout or retries should default to 1000ms and 3, respectively', (t) => {
    const configBlob = {
      url: 'http://localhost:1234/'
    };

    const serviceConfiguration = new ServiceConfiguration('service name', configBlob);

    t.equals(serviceConfiguration.getTimeout(), 1000, 'timeout should have default value');
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
  test.end();

});
