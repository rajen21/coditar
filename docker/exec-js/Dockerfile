FROM node:20-alpine AS builder
WORKDIR /build
COPY entrypoint.ts tsconfig.json ./
RUN npm install -D typescript@5 @types/node@20 && npx tsc

FROM node:20-alpine

# node:20-alpine already ships a non-root "node" user (uid 1000).
COPY --from=builder /build/dist/entrypoint.js /entrypoint.js

USER node
WORKDIR /work

ENTRYPOINT ["node", "/entrypoint.js"]
