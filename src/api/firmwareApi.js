const Joi = require('joi');
const { getLogger } = require('../utils/logger');
const { manageExceptions, returnSchemaError, headersForPrivateApiSchema, BaseApi } = require('./baseApi');
const { corsOrigin } = require("../services/config/config");

const logger = getLogger('FIRMWARE-API');

class FirmwareApi extends BaseApi {
    constructor(prefix = '/firmware') {
        super(prefix, { cors: true, origin: corsOrigin});
    }

    getFirmware(request, h) {
        const firmware = request.params.firmware;
        const file = request.params.file;
        logger.info(`getFirmware ${firmware} ${file} request`);
        // TODO !!!!! send back raw binary file
        return h.response().code(200);
    }

    catchAll(request, h) {
        logger.info(`catch all on path ${request.path} and query ${JSON.stringify(request.query)}`);
        return h.response().code(200);
    }

    routes () {
        return [
            {
                method:'GET',
                path:`${this.prefix}/{firmware}/{file}`,
                handler: this.getFirmware,
                options:{
                    description:'Check if picoferm is already registered',
                    validate:{
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/{p*}`,
                handler: this.catchAll,
                options:{
                    description:'to catch all',
                }
            }
        ];
    }

    asPlugin() {
        return super.asPlugin("FirmwareAPI", "1")
    }
}

module.exports = { FirmwareApi };
