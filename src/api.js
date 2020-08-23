'use strict';
const { version } = require('../package.json');
const { getLogger } = require('./utils/logger');
const { ApolloServer } = require('apollo-server-hapi');
const { MongooseGraphQLSchemaBuilder } = require('./services/graphQLSchemaBuilder');
const Server = require('./server');

// Data model for GraphQL API
const PicoFerm = require('./models/picoFerm');
const Pico = require('./models/pico');

// REST API for devices
const { PicoApi } = require('./api/picoApi');
const { PicoFermApi } = require('./api/picoFermApi');
const { FirmwareApi } = require('./api/firmwareApi');

const ProcessLogger = getLogger('PROCESS');

// Model class
const picoFerm = new PicoFerm();
const pico = new Pico();

// GraphQL schema composition with Mongoose
const schemaBuilder = new MongooseGraphQLSchemaBuilder('picobrewhousedb', [
    (db) => picoFerm.buildModelGraphQLSchema(db),
    (db) => pico.buildModelGraphQLSchema(db)
]);

// Rest API class, available as Hapi plugin
const picoApi = new PicoApi(pico);
const picoFermApi = new PicoFermApi(picoFerm);
const firmwareApi = new FirmwareApi();

// Hapi HTTP server
const server = new Server({});

process.on('unhandledRejection', (err) => {
    ProcessLogger.error(err);
    process.exit(1);
});

ProcessLogger.info(`PicoBrewHouse API v${version}`);

(async () => {
    ProcessLogger.info("Connecting to MongoDB...");
    const schema = await schemaBuilder.composeSchemas();
    const graphQLServer = new ApolloServer({schema:schema});
    Promise.all([
        server.register(picoApi.asPlugin()),
        server.register(picoFermApi.asPlugin()),
        server.register(firmwareApi.asPlugin()),
        graphQLServer.applyMiddleware({ app:server, cors:true })
    ]).then(_ => {
        server.start();
    });
})();
