'use strict';

const proxyquire = require('proxyquire').noCallThru();
const express = require('express');
const tape = require('tape');

const ServiceConfiguration = require('../ServiceConfiguration');

tape('service tests', (test) => {
  test.test('valid interface', (t) => {
    const logger = require('pelias-mock-logger')();

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    });

    t.equal(typeof service, 'function', 'service is a function');
    t.end();
  });

});

tape('conforms_to tests', (test) => {
  test.test('non-ServiceConfiguration instance should throw error', (t) => {
    const serviceConfig = 'not an instance of serviceConfiguration';
    const http_json = require('../http_json');

    t.throws(http_json.bind(null, serviceConfig), /serviceConfig should be an instance of ServiceConfiguration/);
    t.end();

  });

});

tape('do-nothing service tests', (test) => {
  test.test('undefined config.url should return service that logs that config.name service is not available', (t) => {
    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { } );
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isWarnMessage(/^foo service disabled$/));

    service({}, (err) => {
      t.equals(err, 'foo service disabled');
      t.end();
    });

  });

});

tape('failure conditions tests', (test) => {
  test.test('server returning error should log it and return no results', (t) => {
    const server = express().listen();
    const port = server.address().port;

    // immediately close the server so to ensure an error response
    server.close();

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/built_url`;
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, (err, results) => {
      t.equals(err.code, 'ECONNREFUSED');
      t.notOk(results);
      t.ok(logger.isErrorMessage(new RegExp(`^http://localhost:${port}/built_url: .*ECONNREFUSED`)),
        'there should be a connection refused error message');
      t.end();

      server.close();

    });

  });

  test.test('[DNT] server returning error should log it w/sanitized URL and return no results', (t) => {
    const server = express().listen();
    const port = server.address().port;

    // immediately close the server so to ensure an error response
    server.close();

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/built_url`;
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };

    service(req, (err, results) => {
      t.equals(err.code, 'ECONNREFUSED');
      t.notOk(results);
      t.ok(logger.isErrorMessage(new RegExp(`^http://localhost:${port} \\[do_not_track\\]: .*ECONNREFUSED`)),
        'there should be a connection refused error message');
      t.end();

      server.close();

    });

  });

  test.test('server returning non-200 response should log error and return no results', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      t.notOk(req.headers.hasOwnProperty('dnt'), 'dnt header should not have been passed');

      t.equals(req.headers.header1, 'header1 value', 'all headers should have been passed');
      t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

      res.status(400).send('a bad request was made');
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, (err, results) => {
      t.equals(err, `http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value ` +
        'returned status 400: a bad request was made');
      t.notOk(results);
      t.ok(logger.isErrorMessage(`http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value ` +
        `returned status 400: a bad request was made`));
      t.end();

      server.close();

    });

  });

  test.test('[DNT] server returning non-200 response should log sanitized error and return no results', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      t.equals(req.headers.dnt, '1');

      t.equals(req.headers.header1, 'header1 value', 'all headers should have been passed');
      t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

      res.status(400).send('a bad request was made');
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };

    service(req, (err, results) => {
      t.equals(err, `http://localhost:${port} [do_not_track] returned status 400: a bad request was made`);
      t.notOk(results);
      t.ok(logger.isErrorMessage(`http://localhost:${port} [do_not_track] ` +
        `returned status 400: a bad request was made`));
      t.end();

      server.close();

    });

  });

  test.test('server returning 200 statusCode but with non-JSON response should log error and return undefined', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      t.notOk(req.headers.hasOwnProperty('dnt'), 'dnt header should not have been passed');

      t.equals(req.headers.header1, 'header1 value', 'all headers should have been passed');
      t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

      res.set('Content-Type', 'text/plain').status(200).send('this is not parseable as JSON');
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, (err, results) => {
      t.equals(err, `http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value ` +
        `could not parse response: this is not parseable as JSON`);
      t.notOk(results, 'should return undefined');
      t.ok(logger.isErrorMessage(`http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value ` +
        `could not parse response: this is not parseable as JSON`));
      t.end();

      server.close();

    });

  });

  test.test('[DNT] server returning 200 statusCode but with non-JSON response should log sanitized error and return undefined', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      t.equals(req.headers.dnt, '1');

      t.equals(req.headers.header1, 'header1 value', 'all headers should have been passed');
      t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

      res.status(200).send('this is not parseable as JSON');
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };

    service(req, (err, results) => {
      t.equals(err, `http://localhost:${port} [do_not_track] ` +
        `could not parse response: this is not parseable as JSON`);
      t.notOk(results, 'should return undefined');
      t.ok(logger.isErrorMessage(`http://localhost:${port} [do_not_track] ` +
        `could not parse response: this is not parseable as JSON`));
      t.end();

      server.close();

    });

  });

  test.test('server timing out on all requests should log and return error', (t) => {
    const webServer = express();
    let requestCount = 0;
    webServer.get('/some_endpoint', (req, res, next) => {
      requestCount++;
      res.set('Content-Type', 'text/plain').status(503).send('request timeout');
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
      getRetries() {
        return 1;
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, (err, results) => {
      t.equals(err, `http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value ` +
        'returned status 503: request timeout');
      t.notOk(results);
      t.ok(logger.isErrorMessage(`http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value ` +
        `returned status 503: request timeout`));
      t.equals(requestCount, 2);
      t.end();

      server.close();

    });

  });

});

tape('success conditions tests', (test) => {
  test.test('server returning statusCode 200 should return no error and parsed output', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      t.notOk(req.headers.hasOwnProperty('dnt'), 'dnt header should not have been passed');

      t.equals(req.headers.header1, 'header1 value', 'all headers should have been passed');
      t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

      res.status(200).json([1, 2, 3]);
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, (err, results) => {
      t.notOk(err, 'should be no error');
      t.deepEquals(results, [1, 2, 3]);
      t.notOk(logger.hasErrorMessages());
      t.end();

      server.close();

    });

  });

  test.test('getHeaders returning undefined should use empty headers object', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      t.equals(req.headers.dnt, '1');

      t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

      res.status(200).json([1, 2, 3]);
    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return undefined;
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };

    service(req, (err, results) => {
      t.notOk(err, 'should be no error');
      t.deepEquals(results, [1, 2, 3]);
      t.notOk(logger.hasErrorMessages());
      t.end();

      server.close();

    });

  });

  test.test('server succeeding on last timeout chance should return no error and parsed output', (t) => {
    const webServer = express();
    let requestCount = 0;
    webServer.get('/some_endpoint', (req, res, next) => {
      if (++requestCount < 3) {
        res.status(503);

      } else {
        t.notOk(req.headers.hasOwnProperty('dnt'), 'dnt header should not have been passed');
        t.equals(req.headers.header1, 'header1 value', 'all headers should have been passed');
        t.deepEquals(req.query, { param1: 'param1 value', param2: 'param2 value' });

        res.status(200).json([1, 2, 3]);

      }

    });

    const server = webServer.listen();
    const port = server.address().port;

    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { url: `http://localhost:${port}` } );
      }
      getUrl(req) {
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../http_json', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, (err, results) => {
      t.notOk(err, 'should be no error');
      t.deepEquals(results, [1, 2, 3]);
      t.notOk(logger.hasErrorMessages());
      t.equals(requestCount, 3);
      t.end();

      server.close();

    });

  });

});
