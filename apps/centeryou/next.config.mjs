/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ELEVENLABS_API_KEY: process.env.NEXT_ELEVENLABS_API_KEY,
    NEXT_PUBLIC_ELEVENLABS_VOICE_ID: process.env.NEXT_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
  },
};

export default nextConfig;
