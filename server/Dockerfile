FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk --no-cache add curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy application code
COPY . .

# Create directory for secrets
RUN mkdir -p /run/secrets

# Expose port
EXPOSE 3001

# Start the server
CMD ["yarn", "start"] 