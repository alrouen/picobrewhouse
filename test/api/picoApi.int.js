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

// Pico API dictionnary
const { PicoRegistration, PicoFirmware, PicoState, findDictKeyByValue } = require('../../src/models/picoDictionnary');

// REST API for devices
const { PicoApi } = require('../../src/api/picoApi');

// Mock hardware uid
const { pico1Uid, pico2Uid } = require('../mock');

chai.config.includeStack = true; // To display error on tests failures

// Model class
const pico = new Pico();
const picoSession = new PicoSession();

const picoApi = new PicoApi(pico, picoSession);

// GraphQL schema composition with Mongoose
const schemaBuilder = new MongooseGraphQLSchemaBuilder('picobrewhousedb-test', [
    (db) => pico.buildModelGraphQLSchema(db),
    (db) => picoSession.buildModelGraphQLSchema(db)
]);

const server = new Server({});
var graphQLServer;

describe('PICO API integration test', () => {
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
            Promise.resolve().then(done);
        }
    });

    describe('Device registration', () => {

        it('auto register new device #1', async () => {

            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/register?uid=${pico1Uid}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoRegistration.Registered);
        });

        it('auto register new device #2', async () => {

            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/register?uid=${pico2Uid}`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoRegistration.Registered);
        });

        it('allows listing registered devices', async () => {
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

    describe('Device firmware', () => {
        it('allows version registration', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/checkFirmware?uid=${pico1Uid}&version=0.2.6`,
            });
            expect(response.statusCode).to.equal(200);
            expect(response.payload).to.equal(PicoFirmware.NoUpdateAvailable);
        });

        it('allows to retrieve device firmware', async () => {
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
            expect(pico1.firmwareVersion).to.equal("0.2.6");
            const createdAt = moment(pico1.audit.createdAt);
            const updatedAt = moment(pico1.audit.updatedAt);
            expect(updatedAt.isAfter(createdAt)).to.equal(true);
        });
    });

    describe('Device state', () => {
        it('allows state update', async () => {
            const response = await server.inject({
                method: 'GET',
                url: `/API/pico/picoChangeState?picoUID=${pico2Uid}&state=${PicoState.Brewing}`,
            });
            expect(response.statusCode).to.equal(200);
        });

        it('allows to retrieve device state', async () => {
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
            expect(pico2.currentState).to.equal(findDictKeyByValue(PicoState, PicoState.Brewing));
            const createdAt = moment(pico2.audit.createdAt);
            const updatedAt = moment(pico2.audit.updatedAt);
            expect(updatedAt.isAfter(createdAt)).to.equal(true);
        });
    });
});
