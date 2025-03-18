/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i1.sndcdn.com', 'i.ytimg.com'], // Allow SoundCloud CDN images and YouTube images
  },
}

module.exports = nextConfig 