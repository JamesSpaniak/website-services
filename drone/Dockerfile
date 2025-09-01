# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /app
COPY drone/package.json drone/package-lock.json ./
RUN npm ci
COPY drone/. .
RUN pwd && ls -l
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /app

COPY drone/package.json drone/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
EXPOSE 8080
CMD ["npm", "start"]