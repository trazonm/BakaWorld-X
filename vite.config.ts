import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg'],
			manifest: {
				name: 'BakaWorld X',
				short_name: 'BakaWorld',
				description: 'Watch anime, read manga and comics',
				theme_color: '#1e40af',
				background_color: '#111827',
				display: 'standalone',
				orientation: 'any',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: 'apple-touch-icon.png',
						sizes: '180x180',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
				globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
				navigateFallback: null, // Disable navigation fallback for SvelteKit (it handles routing client-side)
				navigateFallbackDenylist: [/^\/_/, /^\/api/], // Don't cache SvelteKit internals or API routes
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							}
						}
					},
					{
						urlPattern: /^https:\/\/api\./,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5 // 5 minutes
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				type: 'module',
				suppressWarnings: true,
				navigateFallback: undefined
			}
		})
	]
});
