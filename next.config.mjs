import { fileURLToPath } from 'url'
import { dirname, resolve }   from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias['@'] = resolve(__dirname, 'src')
    return config
  },
}

export default nextConfig