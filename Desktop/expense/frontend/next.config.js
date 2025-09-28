/*****************************************************
 * Next.js configuration for Expense Tracker frontend
 *****************************************************/
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api'
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
