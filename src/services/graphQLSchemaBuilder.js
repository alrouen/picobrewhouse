const mongooseClient = require('./db/mongooseClient');
const { SchemaComposer } = require('graphql-compose');

class GraphQLSchemaBuilder {
    constructor() {}

    composeSchemas() {
        console.log("WARNING Base GraphQLSchemaBuilder usage. No Schema will be built.");
        return Promise.resolve({})
    }
}

class MongooseGraphQLSchemaBuilder extends GraphQLSchemaBuilder {
    constructor(database, modelBuilders = []) {
        super();
        this.database = database;
        this.modelBuilders = modelBuilders;
        this.connection = null;
    }

    composeSchemas() {
        const database = this.database;
        const modelBuilders = this.modelBuilders;

        return mongooseClient()
            .then(clientDB => {
                const db = clientDB.useDb(database);
                this.connection = db;
                const schemaComposer = new SchemaComposer();
                modelBuilders.forEach(builder => {
                    const { queries, mutations } = builder(db);
                    schemaComposer.Query.addFields(
                        {...queries}
                    );
                    schemaComposer.Mutation.addFields(
                        {...mutations}
                    );
                });
                //return { models: db.models, schema};
                return schemaComposer.buildSchema();
            })
            .catch(err => {
                console.log('Error will connecting to DB instance');
                console.log(err);
            });
    }
}

module.exports = { GraphQLSchemaBuilder, MongooseGraphQLSchemaBuilder };