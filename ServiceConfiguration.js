'use strict';

const _ = require('lodash');

class ServiceConfiguration {
  constructor(name, config) {
    if (_.isEmpty(name)) {
      throw 'name is required';
    }

    this.name = name;
    if (config.url && !_.endsWith(config.url, '/')) {
      this.baseUrl = config.url + '/';
    } else {
      this.baseUrl = config.url;
    }
    this.timeout = config.timeout || 250;
    this.retries = config.retries || 3;

  }

  getName() {
    return this.name;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  isEnabled() {
    return !_.isEmpty(this.baseUrl);
  }

  getUrl() {
    return this.baseUrl;
  }

  getRetries() {
    return this.retries;
  }

  getTimeout() {
    return this.timeout;
  }

  getParameters() {
    return {};
  }

  getHeaders() {
    return {};
  }

}

module.exports = ServiceConfiguration;
