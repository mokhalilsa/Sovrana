/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    INGESTION_URL: process.env.NEXT_PUBLIC_API_INGESTION_URL || 'http://ingestion:8001',
    BRAIN_URL: process.env.NEXT_PUBLIC_API_BRAIN_URL || 'http://brain:8002',
    EXECUTION_URL: process.env.NEXT_PUBLIC_API_EXECUTION_URL || 'http://execution:8003',
  },
}

module.exports = nextConfig
