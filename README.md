<p align="center">
  <img height="100" src="https://raw.githubusercontent.com/pelias/design/master/logo/pelias_github/Github_markdown_hero.png">
</p>
<h3 align="center">A modular, open-source search engine for our world.</h3>
<p align="center">Pelias is a geocoder powered completely by open data, available freely to everyone.</p>
<p align="center">
<a href="https://en.wikipedia.org/wiki/MIT_License"><img src="https://img.shields.io/github/license/pelias/api?style=flat&color=orange" /></a>
<a href="https://hub.docker.com/u/pelias"><img src="https://img.shields.io/docker/pulls/pelias/api?style=flat&color=informational" /></a>
<a href="https://gitter.im/pelias/pelias"><img src="https://img.shields.io/gitter/room/pelias/pelias?style=flat&color=yellow" /></a>
</p>
<p align="center">
	<a href="https://github.com/pelias/docker">Local Installation</a> ·
        <a href="https://geocode.earth">Cloud Webservice</a> ·
	<a href="https://github.com/pelias/documentation">Documentation</a> ·
	<a href="https://gitter.im/pelias/pelias">Community Chat</a>
</p>
<details open>
<summary>What is Pelias?</summary>
<br />
Pelias is a search engine for places worldwide, powered by open data. It turns addresses and place names into geographic coordinates, and turns geographic coordinates into places and addresses. With Pelias, you’re able to turn your users’ place searches into actionable geodata and transform your geodata into real places.
<br /><br />
We think open data, open source, and open strategy win over proprietary solutions at any part of the stack and we want to ensure the services we offer are in line with that vision. We believe that an open geocoder improves over the long-term only if the community can incorporate truly representative local knowledge.
</details>

# Pelias Microservice Wrapper

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
| `timeout` | no | `1000` | the number of milliseconds a request should wait for a server response before timing out |
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
| `getTimeout` | not recommended | `1000` or value passed to constructor | how long a request should wait for a server response before timing out |
| `getRetries` | not recommended | `3` or value passed to constructor | how many attempts should be made before returning an error |

#### Recommended `ServiceConfiguration` Method Overrides

The following methods can be overridden in an implementation of `ServiceConfiguration`:

| method | default return | description |
| --- | --- | --- |
| `getUrl` | value of `getBaseUrl` | used for appending other value to the baseUrl (but not request parameters) |
| `getParameters` | `{}` | any request parameters to pass to the microservice |
| `getHeaders` | `{}` | any request headers to pass to the microservice |

It is not recommended to override any other methods.
