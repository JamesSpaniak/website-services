# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /opt/drone

# Next.js inlines NEXT_PUBLIC_* at build time; set here so pipeline can enable debug logging
ARG NEXT_PUBLIC_DEBUG_LOGGING=
ENV NEXT_PUBLIC_DEBUG_LOGGING=${NEXT_PUBLIC_DEBUG_LOGGING}

# Canonical site URL for metadata, sitemap, and JSON-LD (override in pipeline if needed).
ARG NEXT_PUBLIC_SITE_URL=https://thedroneedge.com
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY next.config.ts next.config.mjs postcss.config.mjs tsconfig.json next-env.d.ts eslint.config.mjs ./
COPY .env ./.env
RUN test ! -f /opt/drone/init_db.sql
RUN pwd && ls -l
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /opt/drone

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /opt/drone/public ./public
COPY --from=builder /opt/drone/.next ./.next
COPY --from=builder /opt/drone/next.config.mjs ./
EXPOSE 8080
CMD ["npm", "start"]