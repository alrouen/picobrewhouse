const Joi = require('joi');
const { getLogger } = require('../utils/logger');
const { manageExceptions, returnSchemaError, headersForPrivateApiSchema, BaseApi } = require('./baseApi');
const { corsOrigin } = require("../services/config/config");

const logger = getLogger('picoFermAPI');

// Query params
const IsRegistered_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    token: Joi.string().alphanum().required(),
}).label('IsRegistered-Query-Parameters');

const CheckFirmware_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    version: Joi.string().required(),
}).label('CheckFirmware-Query-Parameters');

const GetFirmwareAddress_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
}).label('GetFirmwareAddress-Query-Parameters');

const GetState_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
}).label('GetState-Query-Parameters');

const dataSetSchema = Joi.object().keys({
    s1: Joi.number().required(),
    s2: Joi.number().required()
}).label('PicoFerm-DataSet');

const LogDataSet_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    rate: Joi.number().integer().required(),
    voltage: Joi.number().required(),
    data: Joi.string().required()
}).label('LogDataSet-Query-Parameters');


class PicoFermApi extends BaseApi {
    constructor(prefix = '/API/PicoFerm') {
        super(prefix, { cors: true, origin: corsOrigin});
    }

    /**
     *
     * @param request
     * @param h
     * @returns {Promise<T | void>}
     *
     * Register: /API/PicoFerm/isRegistered?uid={uid}&token={token}
     * Response: '#{0}#' where {0} : 1 = Registered, 0 = Not Registered
     */
    isRegistered(request, h) {
        const uid = request.query.uid;
        const token = request.query.token;
        logger.info(`isRegistered from ${uid} with token ${token}`);
        return h.response(`#1#`).code(200);
    }

    /**
     * @param request
     * @param h
     * @returns {Promise<T | void>}
     *
     * Check Firmware: /API/PicoFerm/checkFirmware?uid={UID}&version={VERSION}
     * Response: '#{0}#' where {0} : 1 = Update Available, 0 = No Updates
     */
    checkFirmware(request, h) {
        const uid = request.query.uid;
        const version = request.query.version;
        logger.info(`checkFirmware from ${uid} with version ${version}`);
        return h.response(`#0#`).code(200);
    }

    /**
     * Get Firmware: /API/pico/getFirmware?uid={UID}
     *     Response: RAW Bin File Contents
     *
     *     http://picobrew.com/API/PicoFerm/getFirmwareAddress?uid=600194549078
     *     #http://picobrewcontent.blob.core.windows.net/firmware/picoferm/picoferm_0_2_6.bin#
     *
     * # Get Firmware: /firmware/picoferm/<version>
     *     Response: RAW Bin File
     *
     */

    getFirmwareAddress(request, h) {
        const uid = request.query.uid;
        logger.info(`getFirmwareAddress from ${uid}`);
        return h.response(`#http://picobrew.com/firmware/picoferm/picoferm_0_2_6.bin#`).code(200);
    }

    /**
     *
     * @param request
     * @param h
     * @returns {Promise<T | void>}
     *
     * Get State: /API/PicoFerm/getState?uid={UID}
     *  Response: '#{0}#' where {0} : 2,4 = nothing to do, 10,0 = in progress/send data, 10,16 = in progress/error, 2,16 = complete/stop sending data
     */
    getState(request, h) {
        const uid = request.query.uid;
        logger.info(`getState from ${uid}`);
        return h.response(`#10,0#`).code(200);
    }

    /**
     *
     * @param request
     * @param h
     * @returns {Promise<T | void>}
     *
     * LogDataSet: /API/PicoFerm/logDataSet?uid={UID}&rate={RATE}&voltage={VOLTAGE}&data={DATA}
     *   Response: '#{0}#' where {0} : 10,0 = in progress/send data, ?????
     *
     *   Errors like '10,16' send data but mark data error.
     *   '10,0' tells the PicoFerm to continue to send data.
     *   The server makes a determination when fermenting is done based on the datalog after it sends '2,4'
     */
    logDataSet(request, h) {
        const uid = request.query.uid;
        const rate = request.query.rate;
        const voltage = request.query.voltage;
        const data = request.query.data;
        logger.info(`logDataSet from ${uid}, with rate ${rate}, voltage: ${voltage} and data: ${data}`);
        return h.response(`#10,0#`).code(200);
    }

    catchAll(request, h) {
        logger.info(`catch all on path ${request.path} and query ${JSON.stringify(request.query)}`);
        return h.response().code(200);
    }

    routes () {
        return [
            {
                method:'GET',
                path:`${this.prefix}/isRegistered`,
                handler: this.isRegistered,
                options:{
                    description:'Check if picoferm is already registered',
                    validate:{
                        query: IsRegistered_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/checkFirmware`,
                handler: this.checkFirmware,
                options:{
                    description:'Check for a new firmware',
                    validate:{
                        query: CheckFirmware_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/getFirmwareAddress`,
                handler: this.getFirmwareAddress,
                options:{
                    description:'Return firmware download path',
                    validate:{
                        query: GetFirmwareAddress_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/getState`,
                handler: this.getState,
                options:{
                    description:'Return expected action from a picoFerm',
                    validate:{
                        query: GetState_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/logDataSet`,
                handler: this.logDataSet,
                options:{
                    description:'Receive data from a PicoFerm for logging purpose',
                    validate:{
                        query: LogDataSet_QueryParametersSchema,
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
        return super.asPlugin("PicoFermAPI", "1")
    }
}

module.exports = { PicoFermApi };
