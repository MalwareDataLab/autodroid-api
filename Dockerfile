# Build environment
FROM node:24.21.0-alpine AS build
WORKDIR /usr/app
RUN apk add --no-cache openssl

COPY package.json yarn.lock ./
COPY packages/api/package.json ./packages/api/package.json
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn workspace autodroid-api run build

# Production environment
FROM node:24.21.0-alpine AS production
WORKDIR /usr/app
RUN apk add --no-cache openssl
RUN addgroup -g 1001 -S nodegrp
RUN adduser -S nodejs -u 1001

COPY --from=build /usr/app/package.json /usr/app/yarn.lock /usr/app/scripts/wait-for.sh ./
COPY --from=build /usr/app/packages/api/package.json ./packages/api/package.json
COPY --from=build /usr/app/packages/api/prisma ./packages/api/prisma
COPY --from=build /usr/app/packages/api/dist ./packages/api/src

RUN chown -R nodejs:nodegrp /usr/app
RUN chmod +x ./wait-for.sh

USER nodejs
RUN yarn install --frozen-lockfile --production

EXPOSE 3333
CMD ["yarn", "run-s", "prisma:generate", "prisma:prod", "start:prod"]
