import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  eslint: {
    // Não falhar o build por warnings do ESLint
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Não falhar o build por erros de tipo (já que estamos usando strict)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;