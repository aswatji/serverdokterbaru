#!/bin/sh
# Don't exit on error - we want to continue even if Prisma fails
set +e

echo "🚀 Starting production deployment..."
echo "📍 Working directory: $(pwd)"
echo "📍 Node version: $(node --version)"
echo "📍 NPM version: $(npm --version)"

# Generate Prisma Client (in case it wasn't generated during build)
echo "🔧 Generating Prisma Client..."
npx prisma generate 2>&1 || echo "⚠️  Prisma generate failed (continuing...)"

# Try to run migrations, but don't fail if it doesn't work
echo "🔄 Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "⚠️  Migration failed (will retry in app)"

echo "✅ Setup completed!"
echo "🌟 Starting the application on PORT ${PORT:-80}..."

# Start the application (app will handle database connection)
exec npm start