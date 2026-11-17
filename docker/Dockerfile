FROM docker.io/library/node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci --no-audit --no-fund

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM docker.io/library/node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node docker/healthcheck.cjs ./healthcheck.cjs
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM dependencies AS importer
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then cat /etc/ssl/cert.pem /run/secrets/npm_ca > /tmp/apk-ca.pem; export SSL_CERT_FILE=/tmp/apk-ca.pem; fi; \
    apk add --no-cache poppler-utils && rm -f /tmp/apk-ca.pem
COPY scripts ./scripts
COPY src/lib/catalogue.ts src/lib/geography.ts ./src/lib/
COPY data ./data
RUN mkdir -p data/imports data/scrape-cache && chown -R node:node data
USER node
CMD ["npm", "run", "db:import"]
