/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i1.sndcdn.com', 'i.ytimg.com', 'i.scdn.co'], // Allow SoundCloud CDN images, YouTube images, and Spotify images
  },
}

module.exports = nextConfig 