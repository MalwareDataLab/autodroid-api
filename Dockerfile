# Build environment
FROM node:22.17.1-alpine AS build
WORKDIR /usr/app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production environment
FROM node:22.17.1-alpine AS production
WORKDIR /usr/app
RUN addgroup -g 1001 -S nodegrp
RUN adduser -S nodejs -u 1001

COPY --from=build /usr/app/package.json /usr/app/yarn.lock /usr/app/scripts/wait-for.sh ./
COPY --from=build /usr/app/prisma ./prisma
COPY --from=build /usr/app/dist ./src

RUN chown -R nodejs:nodegrp /usr/app
RUN chmod +x ./wait-for.sh

USER nodejs
RUN yarn install --frozen-lockfile --production

EXPOSE 3333
CMD ["yarn", "run-s", "prisma:generate", "prisma:prod", "start"]
