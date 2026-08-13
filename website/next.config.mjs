/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "@react-three/postprocessing",
    "@react-three/rapier",
    "postprocessing",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sanjaywoodtech.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "www.sanjaywoodtech.com",
        pathname: "/wp-content/**",
      },
    ],
  },
};

export default nextConfig;
