# Use the official Node.js runtime as the base image
FROM node:18-bullseye-slim

# Set the working directory inside the container
WORKDIR /app

# Install OpenSSL and other required dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Buat folder uploads dan beri izin akses
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Generate Prisma client
RUN npx prisma generate

# Create a non-root user to run the application
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Change ownership of the app directory to the nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
ENTRYPOINT ["./entrypoint.sh"]