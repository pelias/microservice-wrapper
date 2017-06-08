const request = require('superagent');
const _ = require('lodash');

const ServiceConfiguration = require('./ServiceConfiguration');

function isDoNotTrack(headers) {
  return _.has(headers, 'DNT') ||
          _.has(headers, 'dnt') ||
          _.has(headers, 'do_not_track');
}

// superagent doesn't exposed the assembled GET request, so synthesize it
function synthesizeUrl(serviceConfig, req) {
  const parameters = _.map(serviceConfig.getParameters(req), (value, key) => {
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

    return (req, callback) => {
      // respond with an error to any call
      callback(`${serviceConfig.getName()} service disabled`);
    };

  }

  logger.info(`using ${serviceConfig.getName()} service at ${serviceConfig.getBaseUrl()}`);
  return (req, callback) => {
    const headers = serviceConfig.getHeaders(req) || {};

    // save off do_not_track value for later check
    const do_not_track = isDoNotTrack(req.headers);

    if (do_not_track) {
      headers.dnt = '1';
    }

    request
      .get(serviceConfig.getUrl(req))
      .set(headers)
      .timeout(serviceConfig.getTimeout())
      .retry(serviceConfig.getRetries())
      .accept('json')
      .query(serviceConfig.getParameters(req))
      .on('error', (err) => {
        if (err.status) {
          // first handle case where a non-200 was returned
          if (do_not_track) {
            logger.error(`${serviceConfig.getBaseUrl()} [do_not_track] returned status ${err.status}: ${err.response.text}`);
            return callback(`${serviceConfig.getBaseUrl()} [do_not_track] returned status ${err.status}: ${err.response.text}`);
          } else {
            logger.error(`${synthesizeUrl(serviceConfig, req)} returned status ${err.status}: ${err.response.text}`);
            return callback(`${synthesizeUrl(serviceConfig, req)} returned status ${err.status}: ${err.response.text}`);
          }

        }

        // handle case that something catastrophic happened while contacting the server
        if (do_not_track) {
          logger.error(`${serviceConfig.getBaseUrl()} [do_not_track]: ${JSON.stringify(err)}`);
          return callback(err);
        } else {
          logger.error(`${serviceConfig.getUrl(req)}: ${JSON.stringify(err)}`);
          return callback(err);
        }

      })
      .end((err, response) => {
        // bail early if there's an error (shouldn't happen since it was already handled above)
        if (err) {
          return;
        }

        // if json was returned then just return it
        if (response.type === 'application/json') {
          return callback(null, response.body);
        }

        if (do_not_track) {
          logger.error(`${serviceConfig.getBaseUrl()} [do_not_track] could not parse response: ${response.text}`);
          return callback(`${serviceConfig.getBaseUrl()} [do_not_track] could not parse response: ${response.text}`);
        } else {
          logger.error(`${synthesizeUrl(serviceConfig, req)} could not parse response: ${response.text}`);
          return callback(`${synthesizeUrl(serviceConfig, req)} could not parse response: ${response.text}`);
        }

      });

  };

};
