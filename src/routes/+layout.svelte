<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { page } from '$app/state';
	import logo from '$lib/assets/logo.png';
	import { goto, afterNavigate } from '$app/navigation';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { theme } from '$lib/stores/theme';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import '../app.css';
	import { registerSW } from 'virtual:pwa-register';
	export const slots = ['content'];

	const navLinks: Array<{ href: string; label: string }> = [
		{ href: '/home', label: 'Home' },
		{ href: '/downloads', label: 'Downloads' },
		{ href: '/anime', label: 'Anime' },
		{ href: '/manga', label: 'Manga' },
		{ href: '/comics', label: 'Comics' },
		{ href: '/brain', label: 'Brain' }
	];

	const menuOpen = writable(false);
	let activeUrl = $derived(page.url.pathname);
	let { children } = $props();

	const toggleMenu = () => {
		menuOpen.update((value) => !value);
	};

	const closeMenu = () => {
		menuOpen.set(false);
	};

	function linkClasses(href: string) {
		const base = 'transition-colors font-semibold';
		return activeUrl === href
			? `${base} text-blue-400`
			: `${base} text-gray-300 hover:text-blue-300`;
	}

	// Close menu on navigation - must be called at top level, not inside onMount
	afterNavigate(() => {
		closeMenu();
	});

	onMount(async () => {
		theme.init();
		await refreshAuth();

		if ('serviceWorker' in navigator) {
			registerSW({
				immediate: true,
				onNeedRefresh() {},
				onOfflineReady() {}
			});
		}
	});

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		auth.set({ isLoggedIn: false, username: '' });
		closeMenu();
		goto('/');
	}
</script>

<nav class="relative z-50 px-4 py-4 md:px-8" style="background-color: var(--theme-bg-primary);">
	<div class="container mx-auto flex items-center justify-between gap-4">
		<!-- Left: Logo and Brand -->
		<a href="/" class="flex items-center gap-3 flex-shrink-0">
			<div style="color-scheme: light; filter: none; -webkit-filter: none;" class="logo-container">
				<img src={logo} alt="BakaWorld Logo" class="h-10 w-10 rounded-full shadow-lg logo-image" />
			</div>
			<span class="text-2xl font-semibold text-white">BakaWorld χ</span>
		</a>
		
		<!-- Center: Navigation Links -->
		<div class="hidden md:flex items-center gap-6 text-sm absolute left-1/2 transform -translate-x-1/2">
			{#each navLinks as link}
				<a href={link.href} class={linkClasses(link.href)}>{link.label}</a>
			{/each}
		</div>
		
		<!-- Right: Theme Toggle, Logout, Mobile Menu -->
		<div class="flex items-center gap-3 ml-auto">
			<!-- Theme Toggle -->
			<ThemeToggle />
			
			{#if $auth.isLoggedIn}
				<button
					class="hidden md:inline-flex items-center rounded-lg border border-red-900 bg-red-700 px-4 py-2 font-semibold text-white shadow hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
					onclick={handleLogout}
				>
					Logout
				</button>
			{/if}
			<button
				class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900/90 text-white shadow-lg ring-1 ring-gray-700 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
				type="button"
				onclick={toggleMenu}
				aria-label={$menuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={$menuOpen}
		>
			<span class="sr-only">Toggle navigation</span>
			{#if $menuOpen}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					stroke="currentColor"
					fill="none"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12" />
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					viewBox="0 0 24 24"
					stroke="currentColor"
					fill="none"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
				</svg>
			{/if}
		</button>
		</div>
	</div>
</nav>

{#if $menuOpen}
	<div class="fixed inset-0 z-40 md:hidden">
		<button
			type="button"
			class="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
			aria-label="Close menu"
			onclick={closeMenu}
		></button>
		<div class="absolute left-4 right-4 top-24 space-y-4 rounded-2xl border theme-border bg-gray-900/95 p-6 shadow-2xl" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
			<div class="space-y-2">
				{#each navLinks as link}
					<a
						href={link.href}
						class={`block rounded-xl px-4 py-3 text-base font-semibold transition ${
							activeUrl === link.href
								? 'bg-blue-900/50 text-blue-300 ring-1 ring-blue-700'
								: 'text-gray-100 hover:bg-gray-800'
						}`}
						onclick={closeMenu}
					>
						{link.label}
					</a>
				{/each}
			</div>
			{#if $auth.isLoggedIn}
				<button
					class="w-full rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
					onclick={handleLogout}
				>
					Logout
				</button>
			{/if}
		</div>
	</div>
{/if}

<!-- PWA Install Prompt -->
<InstallPrompt />

{@render children()}
