const Joi = require('joi');
const { getLogger } = require('../utils/logger');
const { manageExceptions, returnSchemaError, BaseApi } = require('./baseApi');
const { corsOrigin } = require("../services/config/config");
const { PicoRegistration, PicoSessionType, PicoRequiredAction, PicoState, PicoFirmware, findDictKeyByValue } = require('../models/picoDictionnary');

const logger = getLogger('PICO-API');

// Query params
const Register_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
}).label('Register-Query-Parameters');

const ChangeState_QueryParametersSchema = Joi.object().keys({
    picoUID: Joi.string().alphanum().required(),
    state: Joi.number().integer().valid(...Object.values(PicoState)).required()
}).label('ChangeState-Query-Parameters');

const CheckFirmware_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    version: Joi.string().required(),
}).label('CheckFirmware-Query-Parameters');

const GetFirmware_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
}).label('GetFirmware-Query-Parameters');

const GetActionsNeeded_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
}).label('GetActionsNeeded-Query-Parameters');

const GetSession_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    sesType: Joi.number().integer().required()
}).label('GetSession-Query-Parameters');

const LogSession_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    sesId: Joi.string().alphanum().required(),
    wort: Joi.number().integer().required(),
    therm: Joi.number().integer().required(),
    step: Joi.string().required(),
    event: Joi.string(),
    error: Joi.number().integer().required(),
    sesType: Joi.number().integer().required(),
    timeLeft: Joi.number().integer().required(),
    shutScale: Joi.number().required()
}).label('GetSession-Query-Parameters');

const ErrorReport_QueryParametersSchema = Joi.object().keys({
    uid: Joi.string().alphanum().required(),
    code: Joi.number().integer().required(),
    rfid: Joi.string().alphanum().allow('', null)
}).label('GetActionsNeeded-Query-Parameters');

class PicoApi extends BaseApi {
    constructor(service, sessionService, prefix = '/API/pico') {
        super(prefix, {cors: true, origin: corsOrigin});
        this.service = service;
        this.sessionService = sessionService;
    }

    /**
     *
     * @param request
     * @param h
     * @returns {*}
     *
     * Register: /API/pico/register?uid={UID}
     * Response: '#{0}#\r\n' where {0} : T = Registered, F = Not Registered
     */
    register (request, h) {
        const uid = request.query.uid;
        logger.info(`register from ${uid}`);
        return this.service.create(uid)
            .then(r => h.response(PicoRegistration.Registered).code(200))
            .catch(err => manageExceptions(err));
    }

    /**
     *
     * @param request
     * @param h
     * @returns {*}
     *
     * Change State: /API/pico/picoChangeState?picoUID={UID}&state={STATE}
     * State : 2 = Ready, 3 = Brewing, 4 = Sous Vide, 5 = Rack Beer, 6 = Rinse, 7 = Deep Clean, 9 = De-Scale
     *
     * Response: '\r\n'
     *
     */
    changeState (request, h) {
        const uid = request.query.picoUID;
        const state = findDictKeyByValue(PicoState, request.query.state);
        logger.info(`changeState from ${uid} with new state: ${state}`);

        //TODO : when receiving "Ready" state, check for any brewing session related to this machine and set it to "brewing finished"

        return this.service.updateState(uid, state)
            .then(r => h.response(`\r\n`).code(200))
            .catch(err => manageExceptions(err));
    }

    /**
     * @param request
     * @param h
     *
     * Check Firmware: /API/pico/checkFirmware?uid={UID}&version={VERSION}
     * Response: '#{0}#' where {0} : T = Update Available, F = No Updates
     *
     */
    checkFirmware(request, h) {
        const uid = request.query.uid;
        const version = request.query.version;
        logger.info(`checkFirmware from ${uid} with version ${version}`);
        return this.service.updateFirmwareVersion(uid, version)
            .then(r => h.response(PicoFirmware.NoUpdateAvailable).code(200))
            .catch(err => manageExceptions(err));
    }

    /**
     * @param request
     * @param h
     *
     * Get Firmware: /API/pico/getFirmware?uid={UID}
     #     Response: RAW Bin File Contents
     */
    getFirmware(request, h) {
        const uid = request.query.uid;
        logger.info(`getFirmware from ${uid}`);
        //TODO : return raw binary file
        return h.response().code(200);
    }

    /**
     *
     * @param request
     * @param h
     *
     * Actions Needed: /API/pico/getActionsNeeded?uid={UID}
     * Response: '#{0}#' where {0} : Empty = None, 7 = Deep Clean
     */
    getActionsNeeded(request, h) {
        const uid = request.query.uid;
        logger.info(`getActionsNeeded from ${uid}`);
        return h.response(PicoRequiredAction.None).code(200);
    }

    /**
     *
     * @param request
     * @param h
     *
     * Get Session: /API/pico/getSession?uid={UID}&sesType={SESSION_TYPE}
     * Response: '#{0}#\r\n' where {0} : 20 character alpha-numeric session id
     *
     * sesType: 0 = Brewing (never happens since session = 14 alpha-numeric RFID), 1 = Deep Clean, 2 = Sous Vide, 4 = Cold Brew, 5 = Manual Brew
     *
     */
    getSession(request, h) {
        const uid = request.query.uid;
        const sesType = findDictKeyByValue(PicoSessionType ,request.query.sesType);
        logger.info(`getSession from ${uid} for this session type: ${sesType}`);
        return this.service.getDeviceBySerialNumber(uid)
            .then(p => {
                return this.sessionService.createSession(p._id, sesType).then(s => h.response(`#${s.sessionId}#\r\n`).code(200));
            })
            .catch(err => manageExceptions(err));
    }

    /**
     *
     * @param request
     * @param h
     *
     * Log: /API/pico/log?uid={UID}&sesId={SID}&wort={TEMP}&therm={TEMP}&step={STEP_NAME}&[event={STEP_NAME}&]error={ERROR}&sesType={SESSION_TYPE}&timeLeft={TIME}&shutScale={SS}
     * /API/pico/log?uid=ac1a02e59b1381b9cb9cc98c3e0c24dd&sesId=3k41nso1o9uim0f6zh80&wort=32&therm=180&step=step1&event=event1&error=0&sesType=5&timeLeft=500&shutScale=0.16
     #  Response: '\r\n\r\n'
     *
     * 'uid': fields.Str(required=True),          # 32 character alpha-numeric serial number
     * 'sesId': fields.Str(required=True),        # 14/20 character alphanumeric session id
     * 'wort': fields.Int(required=True),         # Integer Temperature
     * 'therm': fields.Int(required=True),        # Integer Temperature
     * 'step': fields.Str(required=True),         # HTTP formatted step name (Preparing%20to%20Brew)
     * 'event': fields.Str(required=False),       # HTTP formatted step name (Preparing%20to%20Brew) : only occurs when new steps start
     * 'error': fields.Int(required=True),        # Integer error number
     * 'sesType': fields.Int(required=True),      # 0 = Brewing, 1 = Deep Clean, 2 = Sous Vide
     * 'timeLeft': fields.Int(required=True),     # Integer (Seconds Left?)
     * 'shutScale': fields.Float(required=True),  # %0.2f
     *
     */
    logSession(request, h) {
        const uid = request.query.uid;
        const { sesId, wort, therm, step, error, timeLeft, shutScale } = request.query;
        const sesType = findDictKeyByValue(PicoSessionType, request.query.sesType);
        const event = "event" in request.query ? request.query.event : null;
        logger.info(`logSession from ${uid} for this session ${sesId} and type: ${sesType}`);
        return this.service.getDeviceBySerialNumber(uid)
            .then(p => {
                return this.sessionService.addBrewingDataSet({
                    brewerId:p._id,
                    sessionType: sesType,
                    sessionId:sesId,
                    wortTemperature:wort,
                    thermoblockTemperature:therm,
                    step,
                    event:event,
                    error,
                    timeLeft,
                    shutScale
                }).then(s => h.response(`\r\n\r\n`).code(200))
            })
            .catch(err => manageExceptions(err));
    }


    /**
     *
     * @param request
     * @param h
     * @returns {*}
     * Error: /API/pico/error?uid={UID}&code={CODE}&rfid={RFID}
     * Response: '\r\n'
     */
    errorReport(request, h) {
        const uid = request.query.uid;
        const errorCode = request.query.code;
        const rfid = "rfid" in request.query ? request.query.rfid : "";
        logger.info(`error report from ${uid} with error code: ${errorCode} (rfid: ${rfid})`);
        return this.service.addError(uid, errorCode)
            .then(r => h.response(`\r\n`).code(200))
            .catch(err => manageExceptions(err));
    }

    catchAll(request, h) {
        logger.info(`catch all on path ${request.path} and query ${JSON.stringify(request.query)}`);
        return h.response().code(200);
    }

    routes () {
        return [
            {
                method:'GET',
                path:`${this.prefix}/register`,
                handler: this.register,
                options:{
                    description:'Check if pico is already registered',
                    validate:{
                        query: Register_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/picoChangeState`,
                handler: this.changeState,
                options:{
                    description:'Received state update from a pico',
                    validate:{
                        query: ChangeState_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/checkFirmware`,
                handler: this.checkFirmware,
                options:{
                    description:'check for new pico firmware',
                    validate:{
                        query: CheckFirmware_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/getFirmware`,
                handler: this.getFirmware,
                options:{
                    description:'retrieve pico firmware',
                    validate:{
                        query: GetFirmware_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/getActionsNeeded`,
                handler: this.getActionsNeeded,
                options:{
                    description:'maintenance advice request',
                    validate:{
                        query: GetActionsNeeded_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/getSession`,
                handler: this.getSession,
                options:{
                    description:'request a new session id',
                    validate:{
                        query: GetSession_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/log`,
                handler: this.logSession,
                options:{
                    description:'log pico session activity',
                    validate:{
                        query: LogSession_QueryParametersSchema,
                        failAction: returnSchemaError
                    },
                }
            },
            {
                method:'GET',
                path:`${this.prefix}/error`,
                handler: this.errorReport,
                options:{
                    description:'error report',
                    validate:{
                        query: ErrorReport_QueryParametersSchema,
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
        ]
    }

    asPlugin() {
        return super.asPlugin("PicoAPI", "1")
    }
}

module.exports = { PicoApi };