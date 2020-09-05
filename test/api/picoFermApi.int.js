const chai = require('chai');
const expect = require('chai').expect;

const moment = require('moment');
const { ApolloServer, gql } = require('apollo-server-hapi');
const { createTestClient } = require('apollo-server-testing');
const { MongooseGraphQLSchemaBuilder } = require('../../src/services/graphQLSchemaBuilder');
const Server = require('../../src/server');

// Data model for GraphQL API
const PicoFerm = require('../../src/models/picoFerm');
const PicoSession = require('../../src/models/picoSession');
const { FermentationTimeSeries } = require('../../src/models/timeseries');

// Pico API dictionnary
const { PicoFermRegistration, PicoFermFirmware, PicoFermState, PicoFermStateResponse,
    findDictKeyByValue } = require('../../src/models/picoDictionnary');

// REST API for devices
const { PicoFermApi: PicoFermApi } = require('../../src/api/picoFermApi');

// Mock hardware uid
const { picoFerm1Uid, picoFerm2Uid, picoFerm1Token, picoFerm2Token } = require('../mock');

chai.config.includeStack = true; // To display error on tests failures

// Model class
const picoFerm = new PicoFerm();
const picoSession = new PicoSession();
const fermentationTS = new FermentationTimeSeries();

const sessionPattern = new RegExp(/#([a-z0-9]{20})#\r\n/);

const picoFermApi = new PicoFermApi(picoFerm, picoSession, fermentationTS);

// GraphQL schema composition with Mongoose
const schemaBuilder = new MongooseGraphQLSchemaBuilder('picobrewhousedb-test', [
    (db) => picoFerm.buildModelGraphQLSchema(db),
    (db) => picoSession.buildModelGraphQLSchema(db),
    (db) => fermentationTS.buildModelGraphQLSchema(db)
]);

const server = new Server({});
var graphQLServer;
var tmpSession;

describe('## PICOFERM API integration test', () => {
    before((done) => {
        schemaBuilder.composeSchemas().then(s => {
            graphQLServer = new ApolloServer({schema:s});
            Promise.all([
                server.register(picoFermApi.asPlugin()),
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
            Promise.resolve().then(done);
        }
    });

    describe(' # Device registration', () => {

        it('Auto register new device #1', async () => {

            const response = await server.inject({
                method: 'GET',
                url: `/API/PicoFerm/isRegistered?uid=${picoFerm1Uid}&token=${picoFerm1Token}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoFermRegistration.Registered);
        });

        it('Auto register new device #2', async () => {

            const response = await server.inject({
                method: 'GET',
                url: `/API/PicoFerm/isRegistered?uid=${picoFerm2Uid}&token=${picoFerm2Token}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoFermRegistration.Registered);
        });

        it('Allows listing registered devices', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query { 
                    picoFermMany {
                        name, 
                        serialNumber, 
                        firmwareVersion, 
                        currentState,
                        audit { createdAt, updatedAt }, 
                        _id 
                    } 
                }
            `;

            const response = await query({ query: QUERY });
            expect(response.data.picoFermMany).to.exist;
            const picos = response.data.picoFermMany;
            expect(picos.length).to.equal(2);
            expect(picos[0].serialNumber).to.equal(picoFerm1Uid);
            expect(picos[1].serialNumber).to.equal(picoFerm2Uid);
            expect(picos[0].name).to.equal(picoFerm1Uid);
            expect(picos[0].firmwareVersion).to.equal("");
            expect(picos[0].currentState).to.equal(PicoFermState.NothingTodo);
            expect(picos[0].audit.createdAt).to.equal(picos[0].audit.updatedAt);
        });
    });

    describe(' # Device firmware', () => {
        it('Allows version registration', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/PicoFerm/checkFirmware?uid=${picoFerm1Uid}&version=0.2.6`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoFermFirmware.NoUpdateAvailable);
        });

        it('Allows to retrieve device firmware', async () => {
            const { query } = createTestClient(graphQLServer);
            const QUERY = gql`
                query {
                    picoFermOne(filter:{serialNumber:"${picoFerm1Uid}"}) {
                        name,
                        serialNumber,
                        audit { createdAt, updatedAt },
                        firmwareVersion,
                        currentState
                    }
                }
            `;
            const response = await query({ query: QUERY });
            expect(response.data.picoFermOne).to.exist;
            const picoFerm1 = response.data.picoFermOne;
            expect(picoFerm1.serialNumber).to.equal(picoFerm1Uid);
            expect(picoFerm1.firmwareVersion).to.equal("0.2.6");
            const createdAt = moment(picoFerm1.audit.createdAt);
            const updatedAt = moment(picoFerm1.audit.updatedAt);
            expect(updatedAt.isAfter(createdAt)).to.equal(true);
        });
    });

    describe(' # Device state', () => {

        it('Allows state retrieval', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/PicoFerm/getState?uid=${picoFerm1Uid}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoFermStateResponse.NothingTodo);
        });

/*        it('Allows state update', async () => {
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
            expect(pico2.currentState).to.equal(findDictKeyByValue(PicoState, PicoState.DeepClean));
            const createdAt = moment(pico2.audit.createdAt);
            const updatedAt = moment(pico2.audit.updatedAt);
            expect(updatedAt.isAfter(createdAt)).to.equal(true);
        });*/


    });

    describe(' # Mutation of device',  () => {
        it('Allows to rename a device', async () => {

            const newName = "myPicoFerm";

            const { query, mutate } = createTestClient(graphQLServer);

            const GET_DEVICE = gql`
                query {
                    picoFermOne(filter:{serialNumber:"${picoFerm1Uid}"}) {
                        name,
                        serialNumber,
                        _id
                    }
                }
            `;

            const getDeviceResponse = await query({ query: GET_DEVICE });
            expect(getDeviceResponse.data.picoFermOne).to.exist;
            const picoId = getDeviceResponse.data.picoFermOne._id;

            const RENAME_DEVICE = gql`
                mutation { picoFermRenameOne(_id:"${picoId}", newName:"${newName}"){recordId}}
            `;

            const renameDeviceResponse = await mutate({ mutation: RENAME_DEVICE });
            expect(renameDeviceResponse.data.picoFermRenameOne).to.exist;

            const renamedDeviceQueryResponse = await query({ query: GET_DEVICE });
            expect(renamedDeviceQueryResponse.data.picoFermOne).to.exist;
            expect(renamedDeviceQueryResponse.data.picoFermOne.serialNumber).to.equal(picoFerm1Uid);
            expect(renamedDeviceQueryResponse.data.picoFermOne._id).to.equal(picoId);
            expect(renamedDeviceQueryResponse.data.picoFermOne.name).to.equal(newName);
        });
    });
/*
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
                    picoSessionOne(filter:{sessionId:"${tmpSession}"}) {
                        name,
                        sessionId,
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
            expect(session.sessionId).to.equal(tmpSession);
            expect(session.brewerId).to.equal(picoId);
            expect(session.sessionType).to.equal(findDictKeyByValue(PicoSessionType, PicoSessionType.ManualBrew));
        });
    });*/
});
