# Platform build of the forked Login V2. Both stages pin the same base by digest
# (R-IMGTRUST-05 pattern, carried onto this fork by
# CB:decision-login-surface-realization#R-LOGSURF-02@r1). The builder resolves the
# pnpm workspace against the committed lockfile with per-artifact hash verification
# (R-BLDATT-09 as carried by the same rule) and runs the unit gates before the
# standalone assembly, so an image is never produced from a tree that failed them.
FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS builder
RUN corepack enable pnpm
# apps/login/src/lib/api.test.ts builds its RSA key fixtures by shelling out to the
# openssl CLI, which the node:24-alpine base does not ship (only the libcrypto
# shared libraries are present). Builder stage only; the runtime stage below never
# installs it.
RUN apk add --no-cache openssl
# Keep the build hermetic: no Nx remote cache, no background daemon, no TUI. The
# corepack prompt guard is set here because the bare pnpm RUNs below do not go
# through Nx's nx:run-commands targetDefaults, which is where nx.json sets it.
ENV NX_NO_CLOUD=true \
    NX_DAEMON=false \
    NX_TUI=false \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json .npmrc ./
COPY proto ./proto
COPY packages ./packages
COPY apps/login ./apps/login
RUN pnpm install --frozen-lockfile
# @zitadel/login's test-unit script runs vitest directly, outside the Nx task graph,
# so the generated proto surface and the built client library must already exist
# when the gate runs. @zitadel/login:build pulls both in through ^build, but that is
# after the gate, so they are produced explicitly here in dependency order.
RUN pnpm exec nx run @zitadel/proto:generate
RUN pnpm exec nx run @zitadel/client:build
RUN pnpm --dir apps/login run test-unit
# NEXT_PUBLIC_* values are inlined into client chunks at build time; bake the
# deployment's own values so the served bundle never depends on runtime inlining.
ENV NEXT_PUBLIC_BASE_PATH=/ui/v2/login \
    NEXT_PUBLIC_THEME_APPEARANCE=milchglas \
    NEXT_OUTPUT_MODE=standalone
RUN pnpm exec nx run @zitadel/login:build

FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
# If /.env-file/.env is mounted into the container, its variables are made available to the server before it starts up.
RUN mkdir -p /.env-file && touch /.env-file/.env && chown -R nextjs:nodejs /.env-file
COPY --from=builder --chown=nextjs:nodejs /build/apps/login/.next/standalone ./
# Standalone output does not include the public/ directory, so the favicon set and
# manifest referenced by DefaultTags would 404 without this copy. The server serves
# it from the app directory beside server.js.
COPY --from=builder --chown=nextjs:nodejs /build/apps/login/public ./apps/login/public
USER nextjs
ENV HOSTNAME="::" \
    PORT="3000" \
    NODE_ENV="production" \
    NODE_OPTIONS="--use-openssl-ca --require /app/load-ssl-cert-dir.cjs" \
    SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    ZITADEL_TLS_ENABLED="false" \
    OTEL_SERVICE_NAME="zitadel-login" \
    OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/usr/local/bin/node", "/app/healthcheck.mjs", "/ui/v2/login/ready"]
ENTRYPOINT ["/app/entrypoint.sh", "node", "apps/login/server.js"]
