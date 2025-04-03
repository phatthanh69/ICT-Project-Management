FROM node:22-alpine

RUN mkdir /app && chown node:node /app
WORKDIR /app

USER node
COPY --chown=node:node package.json package-lock.json* ./

RUN npm install http-proxy-middleware --save-dev

COPY --chown=node:node . .

RUN mkdir -p /app/node_modules/.cache && chmod 777 /app/node_modules/.cache

ENV PORT=3333
ENV NODE_ENV=development

EXPOSE 3333

CMD ["npm", "start"]
