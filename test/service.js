'use strict';

const proxyquire = require('proxyquire').noCallThru();
const express = require('express');
const tape = require('tape');
const _ = require('lodash');

const ServiceConfiguration = require('../ServiceConfiguration');

tape('service tests', (test) => {
  test.test('valid interface', (t) => {
    const logger = require('pelias-mock-logger')();

    const service = proxyquire('../service', {
      'pelias-logger': logger
    });

    t.equal(typeof service, 'function', 'service is a function');
    t.end();
  });

});

tape('conforms_to tests', (test) => {
  test.test('non-ServiceConfiguration instance should throw error', (t) => {
    const serviceConfig = 'not an instance of serviceConfiguration';
    const service = require('../service');

    t.throws(service.bind(null, serviceConfig), /serviceConfig should be an instance of ServiceConfiguration/);
    t.end();

  });

});

tape('request logging', (test) => {
  test.test('full request should be debug-logged when do-not-track is disabled', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      res.status(200).json({});
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

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({}, {}, (err, results) => {
      t.ok(logger.isDebugMessage(`foo: http://localhost:${port}/some_endpoint?param1=param1%20value&param2=param2%20value`));
      t.end();

      server.close();

    });

  });

  test.test('sanitized request should be debug-logged when do-not-track is enabled', (t) => {
    const webServer = express();
    webServer.get('/some_endpoint', (req, res, next) => {
      res.status(200).json({});
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

    const req = {
      headers: {
        dnt: 1
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service(req, {}, (err, results) => {
      t.ok(logger.isDebugMessage(`foo: http://localhost:${port}/`));
      t.end();

      server.close();

    });

  });

});

tape('service disabled tests', (test) => {
  test.test('undefined config.url should return service that logs that config.name service is not available', (t) => {
    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { } );
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isWarnMessage(/^foo service disabled$/));

    service({}, {}, (err) => {
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
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req) {
        // combine req and res to show that both were passed
        return _.extend({}, req.params, res.params);
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    // setup non-empty req and res so their contents can be used later by MockServiceConfig
    const req = {
      // referenced in getParameters
      params: {
        req_param: 'req_param value'
      }
    };
    const res = {
      // referenced in getParameters
      params: {
        res_param: 'res_param value'
      }
    };

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service(req, res, (err, results) => {
      t.equals(err.code, 'ECONNREFUSED');
      t.notOk(results);
      t.ok(logger.isErrorMessage(new RegExp(`^http://localhost:${port}/some_endpoint\\?req_param=req_param%20value&res_param=res_param%20value: .*ECONNREFUSED`)),
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

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };
    const res = {};

    service(req, res, (err, results) => {
      t.equals(err.code, 'ECONNREFUSED');
      t.notOk(results);
      t.ok(logger.isErrorMessage(new RegExp(`^http://localhost:${port}/ \\[do_not_track\\]: .*ECONNREFUSED`)),
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
      t.deepEquals(req.query, { req_param: 'req_param value', res_param: 'res_param value' });

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
        // combine req and res to show that both were passed
        return _.extend({}, req.params, res.params);
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    // setup non-empty req and res so their contents can be used later by MockServiceConfig
    const req = {
      // referenced in getParameters
      params: {
        req_param: 'req_param value'
      }
    };
    const res = {
      // referenced in getParameters
      params: {
        res_param: 'res_param value'
      }
    };

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service(req, res, (err, results) => {
      t.equals(err, `http://localhost:${port}/some_endpoint?req_param=req_param%20value&res_param=res_param%20value ` +
        'returned status 400: a bad request was made');
      t.notOk(results);
      t.ok(logger.isErrorMessage(`http://localhost:${port}/some_endpoint?req_param=req_param%20value&res_param=res_param%20value ` +
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

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };
    const res = {};

    service(req, res, (err, results) => {
      t.equals(err, `http://localhost:${port}/ [do_not_track] returned status 400: a bad request was made`);
      t.notOk(results);
      t.ok(logger.isErrorMessage(`http://localhost:${port}/ [do_not_track] ` +
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
      t.deepEquals(req.query, { req_param: 'req_param value', res_param: 'res_param value' });

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
        // combine req and res to show that both were passed
        return _.extend({}, req.params, res.params);
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    // setup non-empty req and res so their contents can be used later by MockServiceConfig
    const req = {
      // referenced in getParameters
      params: {
        req_param: 'req_param value'
      }
    };
    const res = {
      // referenced in getParameters
      params: {
        res_param: 'res_param value'
      }
    };

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service(req, res, (err, results) => {
      t.equals(err, `http://localhost:${port}/some_endpoint?req_param=req_param%20value&res_param=res_param%20value ` +
        `could not parse response: this is not parseable as JSON`);
      t.notOk(results, 'should return undefined');
      t.ok(logger.isErrorMessage(`http://localhost:${port}/some_endpoint?req_param=req_param%20value&res_param=res_param%20value ` +
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

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };
    const res = {};

    service(req, res, (err, results) => {
      t.equals(err, `http://localhost:${port}/ [do_not_track] ` +
        `could not parse response: this is not parseable as JSON`);
      t.notOk(results, 'should return undefined');
      t.ok(logger.isErrorMessage(`http://localhost:${port}/ [do_not_track] ` +
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
        // combine req and res to show that both were passed
        return _.extend({}, req.params, res.params);
      }
      getHeaders(req) {
        return { header1: 'header1 value' };
      }
      getRetries() {
        return 1;
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    // setup non-empty req and res so their contents can be used later by MockServiceConfig
    const req = {
      // referenced in getParameters
      params: {
        req_param: 'req_param value'
      }
    };
    const res = {
      // referenced in getParameters
      params: {
        res_param: 'res_param value'
      }
    };

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service(req, res, (err, results) => {
      t.equals(err, `http://localhost:${port}/some_endpoint?req_param=req_param%20value&res_param=res_param%20value ` +
        'returned status 503: request timeout');
      t.notOk(results);
      t.ok(logger.isErrorMessage(`http://localhost:${port}/some_endpoint?req_param=req_param%20value&res_param=res_param%20value ` +
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

      t.equals(req.headers.req_header1, 'req_header1 value');
      t.equals(req.headers.req_header2, 'req_header2 value');
      t.equals(req.headers.res_header1, 'res_header1 value');
      t.equals(req.headers.res_header2, 'res_header2 value');

      t.deepEquals(req.query, {
        req_param1: 'req_param1 value',
        req_param2: 'req_param2 value',
        res_param1: 'res_param1 value',
        res_param2: 'res_param2 value'
      });

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
        // pull endpoint from req to show that req was passed
        return `http://localhost:${port}/${req.endpoint}`;
      }
      getParameters(req, res) {
        // combine req and res to show that both were passed
        return _.extend({}, req.params, res.params);
      }
      getHeaders(req, res) {
        // combine req and res to show that both were passed
        return _.extend({}, req.headers, res.headers);
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    // setup non-empty req and res so their contents can be used later by MockServiceConfig
    const req = {
      // referenced in getUrl
      endpoint: 'some_endpoint',
      // referenced in getParameters
      params: {
        req_param1: 'req_param1 value',
        req_param2: 'req_param2 value'
      },
      // referenced in getHeaders
      headers: {
        req_header1: 'req_header1 value',
        req_header2: 'req_header2 value'
      }
    };
    const res = {
      // referenced in getParameters
      params: {
        res_param1: 'res_param1 value',
        res_param2: 'res_param2 value'
      },
      // referenced in getHeaders
      headers: {
        res_header1: 'res_header1 value',
        res_header2: 'res_header2 value'
      }
    };

    service(req, res, (err, results) => {
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

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    const req = {
      headers: {
        dnt: 1
      }
    };
    const res = {};

    service(req, res, (err, results) => {
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

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}/`)));

    service({}, {}, (err, results) => {
      t.notOk(err, 'should be no error');
      t.deepEquals(results, [1, 2, 3]);
      t.notOk(logger.hasErrorMessages());
      t.equals(requestCount, 3);
      t.end();

      server.close();

    });

  });

});

tape('callback-as-2nd-parameter tests', (test) => {
  test.test('service disabled: 2nd parameter should be treated as callback when 3rd parameter is undefined', (t) => {
    const logger = require('pelias-mock-logger')();

    const MockServiceConfig = class extends ServiceConfiguration {
      constructor(o) {
        super('foo', { } );
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isWarnMessage(/^foo service disabled$/));

    service({}, (err) => {
      t.equals(err, 'foo service disabled');
      t.end();
    });

  });

  test.test('service enabled: 2nd parameter should be treated as callback when 3rd parameter is undefined', (t) => {
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
        t.deepEquals(req, { key: 'value' });
        return `http://localhost:${port}/some_endpoint`;
      }
      getParameters(req, res) {
        t.equals(res, undefined, 'should have defined res as undefined in 2-parameter call');
        return { param1: 'param1 value', param2: 'param2 value' };
      }
      getHeaders(req, res) {
        t.equals(res, undefined, 'should have defined res as undefined in 2-parameter call');
        return { header1: 'header1 value' };
      }
    };

    const service = proxyquire('../service', {
      'pelias-logger': logger
    })(new MockServiceConfig());

    t.ok(logger.isInfoMessage(new RegExp(`using foo service at http://localhost:${port}`)));

    service({ key: 'value' }, (err, results) => {
      t.notOk(err, 'should be no error');
      t.deepEquals(results, [1, 2, 3]);
      t.notOk(logger.hasErrorMessages());
      t.end();

      server.close();

    });

  });

});
