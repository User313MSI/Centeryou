/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ELEVENLABS_API_KEY: process.env.NEXT_ELEVENLABS_API_KEY,
  },
};

export default nextConfig;
