/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000/api',
  },
}

module.exports = nextConfig;