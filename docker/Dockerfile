FROM node:18-alpine AS builder

WORKDIR /build

# Install per-challenge runtime deps (no dev deps)
COPY docker/challenges/jwt-middleware/package.json ./jwt-middleware/package.json
RUN cd jwt-middleware \
  && npm install --omit=dev \
  && npm cache clean --force

COPY docker/challenges/todo-api/package.json ./todo-api/package.json
RUN cd todo-api \
  && npm install --omit=dev \
  && npm cache clean --force

# Copy deps into a stable path mounted via NODE_PATH
RUN mkdir -p /deps/jwt-middleware \
  && cp -R /build/jwt-middleware/node_modules /deps/jwt-middleware/

RUN mkdir -p /deps/todo-api \
  && cp -R /build/todo-api/node_modules /deps/todo-api/

FROM node:18-alpine

WORKDIR /app

# Runner deps (jest + supertest)
COPY docker/runner-package.json ./package.json
RUN npm install --omit=dev \
  && npm cache clean --force

# Runner scripts are mounted read-only at /runner from the host, but we also
# keep a copy in the image for debugging.
COPY runner/*.js ./runner/

# Challenge runtime deps
COPY --from=builder /deps/jwt-middleware/node_modules /deps/jwt-middleware/node_modules
COPY --from=builder /deps/todo-api/node_modules /deps/todo-api/node_modules

CMD ["node", "/app/runner/run-express-supertest.js"]
