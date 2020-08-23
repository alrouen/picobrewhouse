const Joi = require('joi');
const Boom = require('@hapi/boom');
const { getLogger } = require('../utils/logger');
const { RecordNotFound, RecordConflict, InvalidSchema, Forbidden } = require('../apiException');

const ApiLogger = getLogger('API');

const manageExceptions = (err) => {
    if(err instanceof RecordNotFound) {
        throw Boom.notFound();
    } else if(err instanceof RecordConflict) {
        throw Boom.conflict();
    } else if(err instanceof InvalidSchema) {
        const errMsg = `Invalid Schema: ${err.apiError.details.map(err => err.message).join(',')}`;
        ApiLogger.error(errMsg);
        throw Boom.badRequest(errMsg);
    } else if(err instanceof Forbidden) {
        throw Boom.forbidden();
    } else {
        ApiLogger.error('unmanaged error/exceptions');
        ApiLogger.error(err);
        throw Boom.internal();
    }
};

const returnSchemaError = (request, h, err) => {
    ApiLogger.error(err);
    throw Boom.badRequest(`Invalid Schema: ${err.details.map(err => err.message).join(',')}`);
};

const returnInternalSchemaError = (request, h, err) => {
    ApiLogger.error('error while validating schema');
    ApiLogger.error(err);
    throw Boom.internal();
};

const headersForPrivateApiSchema = Joi.object({
    'authorization': Joi.string().required().label('JWT-Bearer')
}).options({ allowUnknown: true });

class BaseApi {
    constructor(prefix, { cors = false, origin = '*'}) {
        this.prefix = prefix;
        this.corsOptions = {
            enabled: cors,
            origin:origin
        }
    }

    routes () {
        return [];
    }

    asPlugin(name, version) {
        return {
            name:name,
            version:version,
            register: (server, options) => {

                server.bind(this);
                this.routes().forEach(r => {
                    const tags = r.options.tags || [];
                    if(!tags.includes('api')) {
                        tags.push('api');
                    }

                    if(!tags.includes(this.prefix)) {
                        tags.push(this.prefix);
                    }

                    if(this.corsOptions.enabled) {
                        r.options.cors = {
                            origin: [this.corsOptions.origin]
                        }
                    }

                    r.options['tags'] = tags;
                    server.route(r);
                });
            }
        };
    }
}

module.exports = { manageExceptions, returnInternalSchemaError, returnSchemaError, headersForPrivateApiSchema, BaseApi };