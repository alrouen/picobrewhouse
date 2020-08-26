FROM node:12.18.3-stretch

COPY docker/docker-entrypoint.sh /usr/local/bin/

RUN mkdir app && chown node:node ./app && chown node:node /usr/local/bin/docker-entrypoint.sh && chmod u+x /usr/local/bin/docker-entrypoint.sh
WORKDIR app

USER node
COPY package.json ./
RUN npm i
COPY docker/config.json ./
ADD src ./src

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["node", "./src/api.js"]






