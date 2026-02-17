# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /opt/drone
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY next.config.ts postcss.config.mjs tsconfig.json next-env.d.ts eslint.config.mjs ./
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
EXPOSE 8080
CMD ["npm", "start"]