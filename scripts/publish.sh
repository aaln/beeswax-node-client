#!/bin/bash

# Publish script for beeswax-client

echo "🚀 Publishing beeswax-client to npm..."

# Check if logged in to npm
npm whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ You need to be logged in to npm"
    echo "Run: npm login"
    exit 1
fi

# Clean build directory
echo "🧹 Cleaning build directory..."
rm -rf dist/

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Fix the tests before publishing."
    exit 1
fi

# Build
echo "🔨 Building..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed."
    exit 1
fi

# Publish
echo "📦 Publishing to npm..."
npm publish

if [ $? -eq 0 ]; then
    echo "✅ Successfully published beeswax-client!"
    echo "View at: https://www.npmjs.com/package/beeswax-client"
else
    echo "❌ Publishing failed."
    exit 1
fi