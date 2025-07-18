FROM node:18-alpine

WORKDIR /app

COPY . .

RUN yarn install

RUN yarn prisma generate

RUN yarn build

CMD ["node", "dist/server.js"]
