# Build stage
FROM node:18-alpine as builder

# Install all dependencies
RUN npm ci && npm run bootstrap && npm run build
# Set up chat-core
WORKDIR /app
COPY chat-core ./

# Set up chat-server
WORKDIR /app/chat-server
COPY chat-server/dist/ ./dist/
COPY chat-server/static ./static/
COPY chat-server/package.json ./
COPY chat-server/node_modules/ ./node_modules/

# Set up chat-ui
# NOTE: This must be done after setting up chat-server so that
# static asset directory exists for build to output files to.
WORKDIR /app/chat-ui
COPY chat-ui ./

# Main image
FROM node:18-alpine as main
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/chat-core ./chat-core/
RUN cd chat-core && npm ci
COPY --from=builder /app/chat-server/package*.json ./chat-server/
COPY --from=builder /app/chat-server/static ./chat-server/static
COPY --from=builder /app/chat-server/dist ./chat-server/dist
COPY --from=builder /app/chat-server/node_modules ./chat-server/node_modules

EXPOSE 3000
WORKDIR /app/chat-server
CMD ["npm", "start"]
