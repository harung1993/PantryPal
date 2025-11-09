FROM node:18-alpine

# Install dependencies for Expo
RUN apk add --no-cache \
    git \
    bash

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Expo CLI globally
RUN npm install -g expo-cli @expo/ngrok

# Copy app source
COPY . .

# Expose ports
# 8081: Metro bundler
# 19000-19002: Expo DevTools
EXPOSE 8081 19000 19001 19002

# Start Expo with tunnel for easy access
CMD ["npx", "expo", "start", "--tunnel"]