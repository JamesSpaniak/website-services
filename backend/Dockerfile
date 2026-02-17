# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /opt/backend
COPY package*.json ./
RUN npm ci
COPY . .
RUN test ! -d /opt/backend/src/app
RUN pwd && ls -l
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /opt/backend

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /opt/backend/dist ./dist
EXPOSE 3000
CMD [ "node", "dist/src/main.js" ]

