import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		// Optimisation des images
		formats: ["image/avif", "image/webp"],
		minimumCacheTTL: 31536000, // 1 an en cache
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**.supabase.co",
			},
		],
	},

	// Optimisations de performance
	experimental: {
		optimizeCss: true,
		scrollRestoration: true,
	},

	serverExternalPackages: [],

	// Optimisations du compilateur
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},

	reactStrictMode: true,

	// Headers de sécurité
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Referrer-Policy",
						value: "origin-when-cross-origin",
					},
				],
			},
		];
	},
};

export default nextConfig;
