<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let { username } = data;
	$: ({ username } = data);

	const adminTools = [
		{
			title: '👥 User Management',
			description: 'Manage user accounts, reset passwords, and delete users',
			href: '/admin/users',
			color: 'from-purple-600 to-purple-700',
			icon: '👥'
		},
		{
			title: '🌍 IP Logs',
			description: 'View visitor IP addresses and geolocation data',
			href: '/admin/iplogs',
			color: 'from-blue-600 to-blue-700',
			icon: '🌍'
		},
		{
			title: '📥 All User Downloads',
			description: 'View and manage all torrent downloads from all users',
			href: '/admin/downloads',
			color: 'from-green-600 to-green-700',
			icon: '📥'
		}
	];
</script>

<svelte:head>
	<title>Admin Dashboard - BakaWorld χ</title>
</svelte:head>

<div class="min-h-screen py-8 px-4" style="background: linear-gradient(to bottom right, var(--theme-bg-primary), var(--theme-bg-secondary), var(--theme-bg-primary));">
	<div class="mx-auto max-w-5xl">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h1 class="text-4xl font-bold text-white mb-2">
						Admin Dashboard
					</h1>
					<p style="color: var(--theme-text-secondary);">
						Welcome, <span class="text-blue-400 font-semibold">{username}</span>
					</p>
				</div>
				<a
					href="/home"
					class="px-4 py-2 rounded-lg transition-colors text-white"
					style="background-color: var(--theme-bg-tertiary);"
				>
					← Back to Home
				</a>
			</div>

			<!-- Welcome Card -->
			<div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 shadow-lg mb-8">
				<h2 class="text-2xl font-bold text-white mb-2">Admin Control Panel</h2>
				<p class="text-indigo-100">
					Manage users, monitor activity, and configure system settings from this central dashboard.
				</p>
			</div>
		</div>

		<!-- Admin Tools Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each adminTools as tool}
				<a
					href={tool.href}
					class="group backdrop-blur-sm rounded-lg border p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
					style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);"
				>
					<div class="flex items-start gap-4">
						<div
							class="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br {tool.color} flex items-center justify-center text-3xl shadow-lg"
						>
							{tool.icon}
						</div>
						<div class="flex-1">
							<h3 class="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors" style="color: var(--theme-text-primary);">
								{tool.title}
							</h3>
							<p class="text-sm" style="color: var(--theme-text-secondary);">
								{tool.description}
							</p>
						</div>
						<div class="flex-shrink-0 text-gray-500 group-hover:text-gray-300 transition-colors">
							<svg
								class="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- Quick Stats -->
		<div class="mt-8 backdrop-blur-sm rounded-lg border p-6 shadow-lg" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
			<h3 class="text-lg font-semibold mb-4" style="color: var(--theme-text-primary);">Quick Info</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
						<span class="text-green-400">✓</span>
					</div>
					<div>
						<div style="color: var(--theme-text-secondary);">System Status</div>
						<div class="font-semibold" style="color: var(--theme-text-primary);">Online</div>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
						<span class="text-blue-400">🔐</span>
					</div>
					<div>
						<div style="color: var(--theme-text-secondary);">Security</div>
						<div class="font-semibold" style="color: var(--theme-text-primary);">reCAPTCHA Active</div>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
						<span class="text-purple-400">👤</span>
					</div>
					<div>
						<div style="color: var(--theme-text-secondary);">Access Level</div>
						<div class="font-semibold" style="color: var(--theme-text-primary);">Administrator</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

