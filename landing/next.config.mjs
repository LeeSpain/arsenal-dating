import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This landing app is its OWN root. The repo also has the app's lockfile one level
// up, so pin the file-tracing root to /landing — this silences Next's "multiple
// lockfiles / inferred workspace root" warning and keeps serverless file tracing
// scoped here. (Does not affect the app.)
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
