# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /api
COPY backend/package*.json ./
RUN npm ci
COPY backend/. .
RUN pwd && ls -l
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /api

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /api/dist ./dist
EXPOSE 3000
CMD [ "node", "dist/src/main.js" ]

