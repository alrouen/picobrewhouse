const { composeWithMongoose } =  require('graphql-compose-mongoose');

class BaseModel {
    constructor({modelName, schema, collectionName = null, composerCustomizationOptions = {}}) {
        this.modelName = modelName;
        this.schema = schema;
        this.collectionName = collectionName || modelName;
        this.composerCustomizationOptions = composerCustomizationOptions
        this.queries = {};
        this.mutations = {};
        this._model = null;
    }

    getMongooseModel(dbConnection) {
        return dbConnection.model(this.modelName, this.schema, this.collectionName);
    }

    getModelTC(dbConnection) {
        const model = this.getMongooseModel(dbConnection, this.schema);
        const modelTC = composeWithMongoose(model, this.composerCustomizationOptions);
        return {model, modelTC};
    }

    buildResolver(model, modelTC) {
        console.log("WARNING -- using baseModel resolvers (empty) -- please override this method to define your resolvers");
        this.queries = {};
        this.mutations = {};
    }

    buildModelGraphQLSchema(dbConnection) {
        const {model, modelTC} = this.getModelTC(dbConnection);
        this._model = model;
        this.buildResolver(model, modelTC);

        return {
            queries:this.queries,
            mutations:this.mutations
        }
    }
}

module.exports = { BaseModel };