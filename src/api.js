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

const picoFerm = new PicoFerm();
const pico = new Pico();
const schemaBuilder = new MongooseGraphQLSchemaBuilder('picobrewhousedb', [
    (db) => picoFerm.buildModelGraphQLSchema(db),
    (db) => pico.buildModelGraphQLSchema(db)
]);

const picoApi = new PicoApi(pico);
const picoFermApi = new PicoFermApi();
const firmwareApi = new FirmwareApi();

const server = new Server({});

process.on('unhandledRejection', (err) => {
    ProcessLogger.error(err);
    process.exit(1);
});

ProcessLogger.info(`PicoBrewHouse API v${version}`);

(async () => {
    const schema = await schemaBuilder.composeSchemas();
    const graphQLServer = new ApolloServer({schema:schema});
    Promise.all([
        server.register(picoApi.asPlugin()),
        server.register(picoFermApi.asPlugin()),
        server.register(firmwareApi.asPlugin()),
        graphQLServer.applyMiddleware({ app:server })
    ]).then(_ => {
        server.start();
    });
})();
