#!/bin/bash
set -e

echo "🚀 Starting production deployment setup..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
timeout 30s bash -c "until pg_isready -h ${DATABASE_HOST:-localhost} -p ${DATABASE_PORT:-5432}; do sleep 1; done"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database setup completed!"

# Start the application
echo "🌟 Starting the application..."
exec npm start