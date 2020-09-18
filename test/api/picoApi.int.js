const chai = require('chai');
const expect = require('chai').expect;

const moment = require('moment');
const { ApolloServer, gql } = require('apollo-server-hapi');
const { createTestClient } = require('apollo-server-testing');
const { MongooseGraphQLSchemaBuilder } = require('../../src/services/graphQLSchemaBuilder');
const Server = require('../../src/server');

// Data model for GraphQL API
const Pico = require('../../src/models/pico');
const PicoSession = require('../../src/models/picoSession');
const { BrewingTimeseries } = require('../../src/models/timeseries');

// Pico API dictionnary
const { PicoRegistration, PicoFirmware, PicoState, PicoStateRequest, PicoSessionType,
    findDictKeyByValue } = require('../../src/models/picoDictionnary');

const { PicoSessionState, PicoSessionEvent } = require('../../src/models/sessionMachine');

// REST API for devices
const { PicoApi } = require('../../src/api/picoApi');

// Mock hardware uid
const { pico1Uid, pico2Uid } = require('../mock');

chai.config.includeStack = true; // To display error on tests failures

// Model class
const pico = new Pico();
const picoSession = new PicoSession();
const brewingTS = new BrewingTimeseries();

const sessionPattern = new RegExp(/#([a-z0-9]{20})#\r\n/);

const picoApi = new PicoApi(pico, picoSession, brewingTS);

// GraphQL schema composition with Mongoose
const schemaBuilder = new MongooseGraphQLSchemaBuilder('picobrewhousedb-test', [
    (db) => pico.buildModelGraphQLSchema(db),
    (db) => picoSession.buildModelGraphQLSchema(db),
    (db) => brewingTS.buildModelGraphQLSchema(db)
]);

const server = new Server({});
var graphQLServer;
var tmpSession;
var tmpSession_id;

const wait = async (ms = 500) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const logData = async (uid, sesId, wort, therm, step, error, sesType, timeLeft, shutScale, event = null) => {
    let url = `/API/pico/log?uid=${uid}&&sesId=${sesId}&wort=${wort}&therm=${therm}&step=${step}&error=${error}&sesType=${sesType}&timeLeft=${timeLeft}&shutScale=${shutScale}`
    if(!!event) {
        url = `${url}&event=${event}`;
    }
    return server.inject({
        method: 'GET',
        url
    });
};

describe('## PICO API integration test', () => {
    before((done) => {
        schemaBuilder.composeSchemas().then(s => {
            graphQLServer = new ApolloServer({schema:s});
            Promise.all([
                server.register(picoApi.asPlugin()),
                graphQLServer.applyMiddleware({ app:server, cors:true })
            ]).then(_ => {
                server.start().then(done);
            });
        });
    });

    after((done) => {
        const connection = schemaBuilder.connection;
        if(!!connection) {
            connection.db.dropDatabase().then(_ => {
                connection.close().then(_ => {
                    server.stop().then(done);
                });
            });
        } else {
            Promise.resolve(done);
        }
    });

    describe(' # Device registration', () => {

        it('Auto register new device #1', async () => {

            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/register?uid=${pico1Uid}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoRegistration.Registered);
        });

        it('Auto register new device #2', async () => {

            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/register?uid=${pico2Uid}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoRegistration.Registered);
        });

        it('Allows listing registered devices', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query { 
                    picoMany {
                        name, 
                        serialNumber, 
                        firmwareVersion, 
                        currentState, 
                        errorLog { error, date, acknowledged }, 
                        audit { createdAt, updatedAt }, 
                        _id 
                    } 
                }
            `;

            const response = await query({ query: QUERY });
            expect(response.data.picoMany).to.exist;
            const picos = response.data.picoMany;
            expect(picos.length).to.equal(2);
            expect(picos[0].serialNumber).to.equal(pico1Uid);
            expect(picos[1].serialNumber).to.equal(pico2Uid);
            expect(picos[0].name).to.equal(pico1Uid);
            expect(picos[0].firmwareVersion).to.equal("");
            expect(picos[0].currentState).to.equal(findDictKeyByValue(PicoState, PicoState.Ready));
            expect(picos[0].errorLog.length).to.equal(0);
            expect(picos[0].audit.createdAt).to.equal(picos[0].audit.updatedAt);
        });
    });

    describe(' # Device firmware', () => {
        it('Allows version registration', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/checkFirmware?uid=${pico1Uid}&version=0.1.34`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoFirmware.NoUpdateAvailable);
        });

        it('Allows to retrieve device firmware', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query {
                    picoOne(filter:{serialNumber:"${pico1Uid}"}) { 
                        name, 
                        serialNumber, 
                        audit { createdAt, updatedAt }, 
                        firmwareVersion
                    }
                }
            `;
            const response = await query({ query: QUERY });
            expect(response.data.picoOne).to.exist;
            const pico1 = response.data.picoOne;
            expect(pico1.serialNumber).to.equal(pico1Uid);
            expect(pico1.firmwareVersion).to.equal("0.1.34");
            const createdAt = moment(pico1.audit.createdAt);
            const updatedAt = moment(pico1.audit.updatedAt);
            expect(updatedAt.isAfter(createdAt)).to.equal(true);
        });
    });

    describe(' # Device state', () => {
        it('Allows state update', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/picoChangeState?picoUID=${pico2Uid}&state=${PicoStateRequest.DeepClean}`,
            });
            expect(response.statusCode).to.equal(200);
        });

        it('Allows to retrieve device state', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query {
                    picoOne(filter:{serialNumber:"${pico2Uid}"}) { 
                        name, 
                        serialNumber, 
                        audit { createdAt, updatedAt }, 
                        currentState
                    }
                }
            `;
            const response = await query({ query: QUERY });
            expect(response.data.picoOne).to.exist;
            const pico2 = response.data.picoOne;
            expect(pico2.serialNumber).to.equal(pico2Uid);
            expect(pico2.currentState).to.equal(PicoState.DeepClean);
            const createdAt = moment(pico2.audit.createdAt);
            const updatedAt = moment(pico2.audit.updatedAt);
            expect(updatedAt.isAfter(createdAt)).to.equal(true);
        });
    });

    describe(' # Mutation of device',  () => {
        it('Allows to rename a device', async () => {

            const newName = "myPico";

            const { query, mutate } = createTestClient(graphQLServer);

            const GET_DEVICE = gql`
                query {
                    picoOne(filter:{serialNumber:"${pico1Uid}"}) { 
                        name, 
                        serialNumber, 
                        _id
                    }
                }
            `;

            const getDeviceResponse = await query({ query: GET_DEVICE });
            expect(getDeviceResponse.data.picoOne).to.exist;
            const picoId = getDeviceResponse.data.picoOne._id;

            const RENAME_DEVICE = gql`
                mutation { picoRenameOne(_id:"${picoId}", newName:"${newName}"){recordId}}
            `;

            const renameDeviceResponse = await mutate({ mutation: RENAME_DEVICE });
            expect(renameDeviceResponse.data.picoRenameOne).to.exist;

            const renamedDeviceQueryResponse = await query({ query: GET_DEVICE });
            expect(renamedDeviceQueryResponse.data.picoOne).to.exist;
            expect(renamedDeviceQueryResponse.data.picoOne.serialNumber).to.equal(pico1Uid);
            expect(renamedDeviceQueryResponse.data.picoOne._id).to.equal(picoId);
            expect(renamedDeviceQueryResponse.data.picoOne.name).to.equal(newName);


        });
    });

    describe(' # Session', () => {
        it('Allows to get a new session ID', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/getSession?uid=${pico2Uid}&sesType=${PicoSessionType.ManualBrew}`
            });

            expect(response.statusCode).to.equal(200);
            const match = response.payload.match(sessionPattern);
            expect(match).to.exist;
            expect(match[1].length).to.equal(20);
            tmpSession = match[1];
        });

        it('Allows to monitor session progress', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query {
                    picoSessionOne(filter:{picoSessionId:"${tmpSession}"}) { 
                        name, 
                        picoSessionId,
                        sessionType,
                        brewerId,
                        audit { createdAt, updatedAt }
                    }
                }
            `;

            const PicoIdQuery = gql`
                query {
                    picoOne(filter:{serialNumber:"${pico2Uid}"}) {_id}
                }
            `;

            const response = await query({ query: QUERY });
            const responsePicoId = await query({query:PicoIdQuery});

            expect(responsePicoId.data.picoOne).to.exist;
            const picoId = responsePicoId.data.picoOne._id;
            expect(response.data.picoSessionOne).to.exist;

            const session = response.data.picoSessionOne;
            expect(session.picoSessionId).to.equal(tmpSession);
            expect(session.brewerId).to.equal(picoId);
            expect(session.sessionType).to.equal(findDictKeyByValue(PicoSessionType, PicoSessionType.ManualBrew));
        });

        it('Allows to log brewing session data', async () => {
            let response = await logData(pico2Uid, tmpSession, 77, 301, 'Waiting Instructions', 0, PicoSessionType.ManualBrew, 0, 0.16, 'Waiting Instructions');
            expect(response.statusCode).to.equal(200);
            await wait();

            response = await logData(pico2Uid, tmpSession, 77, 301, 'Waiting Instructions', 0, PicoSessionType.ManualBrew, 0, 0.16, 'Waiting Instructions');
            expect(response.statusCode).to.equal(200);
            await wait();

            response = await logData(pico2Uid, tmpSession, 78, 299, 'Step 1', 0, PicoSessionType.ManualBrew, 0, 0.16, 'Step 1');
            expect(response.statusCode).to.equal(200);
            await wait();

            response = await logData(pico2Uid, tmpSession, 82, 299, 'Step 1', 0, PicoSessionType.ManualBrew, 594, 0.16);
            expect(response.statusCode).to.equal(200);
            await wait();

            response = await logData(pico2Uid, tmpSession, 124, 299, 'Step 1', 0, PicoSessionType.ManualBrew, 71, 0.16);
            expect(response.statusCode).to.equal(200);
            await wait();

            response = await logData(pico2Uid, tmpSession, 161, 299, 'Waiting Instructions', 0, PicoSessionType.ManualBrew, 0, 0.16, 'Waiting Instructions');
            expect(response.statusCode).to.equal(200);
        });

        it('Allows to review session data', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query {
                    picoSessionOne(filter:{picoSessionId:"${tmpSession}"}) {
                        _id, 
                        name, 
                        picoSessionId,
                        sessionType,
                        brewerId,
                        status,
                        statusHistory { event, previousState, eventDate },
                        statusHistory { event, previousState, eventDate },
                        brewingParameters { fermentationDuration, startOfFermentation, coldCrashingDuration, startOfColdCrashing, carbonatingDuration, startOfCarbonating },
                        audit { createdAt, updatedAt }
                    }
                }
            `;

            const response = await query({ query: QUERY });
            expect(response.data.picoSessionOne).to.exist;
            const session = response.data.picoSessionOne;

            expect(session.status).to.equal(PicoSessionState.Brewing);
            expect(session.statusHistory.length).to.equal(1);
            expect(session.statusHistory[0].previousState).to.equal(PicoSessionState.Idle);
            expect(session.statusHistory[0].event).to.equal(PicoSessionEvent.START_BREWING);
            tmpSession_id = session._id;
        });

        it('Allows to retrieve aggregated data', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query {
                    brewingTSBySessionId(sessionId:"${tmpSession_id}") 
                    {recordId, record {wt, tt, s, err, e, t, _ts}}
                }
            `;

            const response = await query({ query: QUERY });
            expect(response.data.brewingTSBySessionId).to.exist;
            const data = response.data.brewingTSBySessionId.record;
            expect(data.length).to.equal(6)
            expect(data[4].tt).to.equal(148.333);
            //console.log(data);

        })

    });
});
