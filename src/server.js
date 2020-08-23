const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Qs = require('qs');
const { getLogger } = require('./utils/logger');
const { corsOrigin, port } = require("../config");
const Pack = require('../package');

const ServerLogger = getLogger('SERVER');

const swaggerOptions = {
    info: {
        title: 'AI Resource API Documentation',
        version: Pack.version,
    },
    reuseDefinitions:false,
    definitionPrefix:'useLabel',
    grouping: 'tags'
};

class Server {
    constructor({securityName, securityScheme, securityStrategy} = {}) {
        this.server = Hapi.server({
            port: port,
            host: "0.0.0.0",
            query: {
                parser: (query) => Qs.parse(query)
            },
            router: {
                stripTrailingSlash:true
            }
        });

        this.server.register([
            {
                name:'onlyJsonPayload',
                version:'1',
                register: (server, options) => {
                    server.ext('onRequest', (request, h) => {
                        const contentType = request.headers['content-type'];
                        const method = request.method.toUpperCase();
                        if( (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
                            (!contentType || contentType.indexOf('application/json') !== 0)) {
                            return h.response().code(400).takeover() ;
                        }
                        return h.continue;
                    });
                }
            },
            Inert,
            Vision,
            {
                plugin: HapiSwagger,
                options: swaggerOptions
            }
        ]);

        if(!!securityName && securityStrategy && securityStrategy) {
            this.server.auth.strategy(securityName, securityScheme, securityStrategy);
            this.server.auth.default(securityName);
        }

        this.bindRoute('GET', '/health', (request, h) => {
            return h.response().code(200).takeover();
        }, "service health endpoint", false, ['/health']);
    }

    async start() {
        await this.server.start();
        ServerLogger.info(`*** Server running on ${this.server.info.uri}, and CORS origin set to: '${corsOrigin}' ***`, );
    }

    async stop() {
        await this.server.stop();
        ServerLogger.info('*** Server stopped ***');
    }

    bindRoute(method, path, handler, description = '', auth = true, tags = []) {

        const options = {
            method:method,
            path:path,
            handler:handler,
            options:{}
        };

        if(description.length>0) {
            options.options.description = description;
        }

        if(!auth) {
            options.options.auth = false;
        }

        if(tags && tags.length > 0) {
            options.options.tags = tags;
            if(!options.options.tags.includes('api')) {
                options.options.tags.push('api');
            }
        }
        this.server.route(options);
    }

    bindRoutes(routes) {
        routes.forEach(r => {
            this.server.route({
                method:r.method,
                path:r.path,
                handler: r.handler
            });
        });
    }

    async register(plugin, options) {
        await this.server.register(plugin, options);
    }

    inject(obj) {
        return this.server.inject(obj);
    }

    route(obj) {
        return this.server.route(obj);
    }

    ext(obj) {
        return this.server.ext(obj);
    }
}


module.exports = Server;