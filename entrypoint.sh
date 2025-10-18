#!/bin/bash
set -e

echo "🚀 Starting production deployment setup..."

# Wait for database to be ready (using Prisma instead of pg_isready)
echo "⏳ Waiting for database connection..."
max_retries=30
retry_count=0

until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1 || [ $retry_count -eq $max_retries ]; do
  retry_count=$((retry_count + 1))
  echo "   Attempt $retry_count/$max_retries..."
  sleep 1
done

if [ $retry_count -eq $max_retries ]; then
  echo "❌ Database connection timeout. Starting anyway..."
else
  echo "✅ Database connected!"
fi

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database setup completed!"

# Start the application
echo "🌟 Starting the application..."
exec npm start