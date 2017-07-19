> This repository is part of the [Pelias](https://github.com/pelias/pelias) project. Pelias is an open-source, open-data geocoder built by [Mapzen](https://www.mapzen.com/) that also powers [Mapzen Search](https://mapzen.com/projects/search). Our official user documentation is [here](https://mapzen.com/documentation/search/).

# Pelias Microservice Wrapper

![Travis CI Status](https://travis-ci.org/pelias/microservice-wrapper.svg)
[![Gitter Chat](https://badges.gitter.im/pelias/pelias.svg)](https://gitter.im/pelias/pelias?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

## Overview

Module that provides a convenience wrapper for calling Pelias microservices such as [Placeholder](https://github.com/pelias/placeholder) or [Point-in-Polygon Service](https://github.com/pelias/pip-service) over HTTP GET.  

## Installation

```bash
$ npm install pelias-microservice-wrapper
```

[![NPM](https://nodei.co/npm/pelias-microservice-wrapper.png?downloads=true&stars=true)](https://nodei.co/npm/pelias-microservice-wrapper)

## NPM Module

The `pelias-microservice-wrapper` npm module can be found here:

[https://npmjs.org/package/pelias-microservice-wrapper](https://npmjs.org/package/pelias-microservice-wrapper)

## Usage

This module is primarily used in the Pelias [API](https://github.com/pelias/api) to call microservices.  To add support for a microservice in the API, define a class that derives from [ServiceConfiguration](https://github.com/pelias/microservice-wrapper/blob/master/ServiceConfiguration.js), override any methods, and inject into a [service](https://github.com/pelias/microservice-wrapper/blob/master/service.js) instance.  

The [ServiceConfiguration](https://github.com/pelias/microservice-wrapper/blob/master/ServiceConfiguration.js) constructor accepts a string service name (returned by `getName()` and an object containing the three optional properties:

| property | required | default | description |
| --- | --- | --- | --- |
| `baseUrl` | no | none | the base URL used for contacting a service, causes `isEnabled()` to return `false` when an empty string |
| `timeout` | no | `250` | the number of milliseconds a request should wait for a server response before timing out |
| `retries` | no | `3` | the number of retries to attempt before returning an error |

Requests are logged at the `debug` level when enabled in [pelias-config](https://github.com/pelias/config).

### Example

```javascript
const DemoServiceConfig = class extends ServiceConfiguration {
  constructor(configBlob) {
    super('demo microservice', configBlob);
  }
  getUrl(req) {
    return this.baseUrl + '/demo';
  }
  getParameters(req) {
    return {
      size: req.clean.size,
      offset: 0
    };
  }
  getHeaders(req) {
    return {
      'some-header': req.clean.some_header
    };
  }
};

const demoService = serviceWrapper(new DemoServiceConfig({
  url: 'http://localhost:1234'
}));

const req = {
  size: 15,
  some_header: 'header value'
};

// pseudocode tests for illustration purposes
demoService.getUrl() === 'http://localhost:1234/demo';

demoService.isEnabled() === true

demoService.getParameters(req) === {
  size: 15,
  offset: 0
};

demoService.getHeaders(req) === {
  some_header: 'header value'
};
```

### Methods

| method | override? | returns | description |
| --- | --- | --- | --- |
| `getName` | not recommended | value passed to constructor | returns the name of the service |
| `getBaseUrl` | not recommended | `url` property of configuration passed to constructor | base URL of microservice |
| `isEnabled` | not recommended | `true` if `baseUrl` is a non-empty string | helper method for determining if the service should be considered enabled |
| `getUrl` | yes | value of `getBaseUrl` unless overridden | used for appending other value to the baseUrl (but not request parameters) |
| `getParameters` | yes| `{}` unless overridden | any request parameters to pass to the microservice |
| `getHeaders` | yes | `{}` unless overridden | any request headers to pass to the microservice |
| `getTimeout` | not recommended | `250` or value passed to constructor | how long a request should wait for a server response before timing out |
| `getRetries` | not recommended | `3` or value passed to constructor | how many attempts should be made before returning an error |

#### Recommended `ServiceConfiguration` Method Overrides

The following methods can be overridden in an implementation of `ServiceConfiguration`:

| method | default return | description |
| --- | --- | --- |
| `getUrl` | value of `getBaseUrl` | used for appending other value to the baseUrl (but not request parameters) |
| `getParameters` | `{}` | any request parameters to pass to the microservice |
| `getHeaders` | `{}` | any request headers to pass to the microservice |

It is not recommended to override any other methods.
