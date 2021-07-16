const http = require('http');
const https = require('https');
const request = require('superagent');
const _ = require('lodash');

const ServiceConfiguration = require('./ServiceConfiguration');

function isDoNotTrack(headers) {
  return _.has(headers, 'DNT') ||
          _.has(headers, 'dnt') ||
          _.has(headers, 'do_not_track');
}

// superagent doesn't exposed the assembled GET request, so synthesize it
function synthesizeUrl(serviceConfig, req, res) {
  const parameters = _.map(serviceConfig.getParameters(req, res), (value, key) => {
    return `${key}=${value}`;
  }).join('&');

  if (parameters) {
    return encodeURI(`${serviceConfig.getUrl(req)}?${parameters}`);
  } else {
    return serviceConfig.getUrl(req);
  }

}

module.exports = function setup(serviceConfig) {
  if (!(serviceConfig instanceof ServiceConfiguration)) {
    throw Error('serviceConfig should be an instance of ServiceConfiguration');
  }

  const logger = require( 'pelias-logger' ).get( serviceConfig.getName() );

  if (!serviceConfig.isEnabled()) {
    logger.warn(`${serviceConfig.getName()} service disabled`);

    return (req, res, callback) => {
      // only req was passed in so treat res as callback
      if (_.isUndefined(callback)) {
        callback = res;
      }
      // respond with an error to any call
      callback(`${serviceConfig.getName()} service disabled`);
    };

  }

  logger.info(`using ${serviceConfig.getName()} service at ${serviceConfig.getBaseUrl()}`);

  const connection_library = serviceConfig.getBaseUrl().startsWith('https') ? https : http;

  // create one HTTP agent with keep alives enabled per service instance
  const agent = new connection_library.Agent({
    keepAlive: true
  });

  return (req, res, callback) => {
    // only req was passed in so treat res as callback
    if (_.isUndefined(callback)) {
      callback = res;
      res = undefined;
    }

    const headers = serviceConfig.getHeaders(req, res) || {};

    // save off do_not_track value for later check
    const do_not_track = isDoNotTrack(req.headers);
    let url_for_logging;

    if (do_not_track) {
      headers.dnt = '1';
      url_for_logging = serviceConfig.getBaseUrl();
    } else {
      url_for_logging = synthesizeUrl(serviceConfig, req, res);
    }

    logger.debug(`${serviceConfig.getName()}: ${url_for_logging}`);

    const startTime = Date.now();

    request
      .get(serviceConfig.getUrl(req))
      .set(headers)
      .timeout(serviceConfig.getTimeout())
      .retry(serviceConfig.getRetries())
      .agent(agent)
      .accept('json')
      .query(serviceConfig.getParameters(req, res))
      .on('error', (err) => {
        if (err.status) {
          // first handle case where a non-200 was returned
          if (do_not_track) {
            logger.error(`${url_for_logging} [do_not_track] returned status ${err.status}: ${err.response.text}`);
            return callback(`${url_for_logging} [do_not_track] returned status ${err.status}: ${err.response.text}`);
          } else {
            logger.error(`${url_for_logging} returned status ${err.status}: ${err.response.text}`);
            return callback(`${url_for_logging} returned status ${err.status}: ${err.response.text}`);
          }

        }

        // handle case that something catastrophic happened while contacting the server
        if (do_not_track) {
          logger.error(`${url_for_logging} [do_not_track]: ${JSON.stringify(err)}`);
          return callback(err);
        } else {
          logger.error(`${url_for_logging}: ${JSON.stringify(err)}`);
          return callback(err);
        }

      })
      .end((err, response) => {
        // bail early if there's an error (shouldn't happen since it was already handled above)
        if (err) {
          return;
        }

        const metadata = {
          response_time: Date.now() - startTime
        };

        // if json was returned then just return it
        if (response.type === 'application/json') {
          return callback(null, response.body, metadata);
        }

        if (do_not_track) {
          logger.error(`${url_for_logging} [do_not_track] could not parse response: ${response.text}`);
          return callback(`${url_for_logging} [do_not_track] could not parse response: ${response.text}`, null, metadata);
        } else {
          logger.error(`${url_for_logging} could not parse response: ${response.text}`);
          return callback(`${url_for_logging} could not parse response: ${response.text}`, null, metadata);
        }

      });

  };

};
