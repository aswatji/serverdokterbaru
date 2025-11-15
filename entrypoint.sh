#!/bin/sh
set -e

echo "🚀 Starting production deployment..."

# Generate Prisma Client (in case it wasn't generated during build)
echo "🔧 Generating Prisma Client..."
npx prisma generate || echo "⚠️  Prisma generate warning (continuing...)"

# Try to run migrations, but don't fail if it doesn't work
echo "🔄 Running database migrations..."
npx prisma migrate deploy 2>/dev/null || echo "⚠️  Migration skipped (will retry in app)"

echo "✅ Setup completed!"

# Start the application (app will handle database connection)
echo "🌟 Starting the application..."
exec npm start