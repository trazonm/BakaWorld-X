<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { page } from '$app/state';
	import logo from '$lib/assets/logo.png';
	import { browser } from '$app/environment';
	import { goto, afterNavigate, beforeNavigate } from '$app/navigation';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { theme } from '$lib/stores/theme';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import AudioMuteButton from '$lib/components/AudioMuteButton.svelte';
	import SiteAmbientCanvas from '$lib/components/SiteAmbientCanvas.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import '../app.css';
	import { registerSW } from 'virtual:pwa-register';
	export const slots = ['content'];

	const adminUsers = ['bakaboi341'];
	
	let isAdmin = $derived($auth.isLoggedIn && adminUsers.includes($auth.username.toLowerCase()));
	
	let navLinks = $derived([
		{ href: '/home', label: 'Home' },
		{ href: '/downloads', label: 'Downloads' },
		{ href: '/youtube', label: 'Premiumizer' },
		{ href: '/anime', label: 'Anime' },
		{ href: '/movies', label: 'Movies & TV' },
		{ href: '/manga', label: 'Manga' },
		{ href: '/comics', label: 'Comics' },
		{ href: '/brain', label: 'Brain' },
		...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : [])
	]);

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
		const base =
			'rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 max-lg:py-2.5';
		return activeUrl === href || (href !== '/' && activeUrl.startsWith(href + '/'))
			? `${base} bg-white/10 text-white shadow-sm ring-1 ring-violet-400/35`
			: `${base} text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100`;
	}

	// Drop focus before swap so autofill / IME overlays from the previous page
	// (e.g. Premiumizer URL field) are not left composited on screen.
	beforeNavigate(() => {
		if (!browser) return;
		const el = document.activeElement;
		if (el instanceof HTMLElement) el.blur();
	});

	// Close menu on navigation - must be called at top level, not inside onMount
	afterNavigate(({ from, to }) => {
		closeMenu();
		// Reset scroll so a tall previous page cannot leave the viewport showing stale composited pixels
		if (browser && from?.url.pathname !== to?.url.pathname) {
			requestAnimationFrame(() => {
				window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
			});
		}
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

<div class="relative isolate min-h-screen">
	<SiteAmbientCanvas />

	<nav
		class="sticky top-0 z-50 border-none bg-transparent px-4 py-3 md:px-8 md:py-3.5"
	>
	<div class="container mx-auto flex items-center justify-between gap-4">
		<!-- Left: Logo and Brand -->
		<a href="/" class="flex flex-shrink-0 items-center gap-3">
			<div style="color-scheme: light; filter: none; -webkit-filter: none;" class="logo-container">
				<img src={logo} alt="BakaWorld Logo" class="logo-image h-10 w-10 rounded-xl shadow-md ring-1 ring-white/10" />
			</div>
			<span class="text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">BakaWorld χ</span>
		</a>
		
		<!-- Center: Navigation Links -->
		<div class="absolute left-1/2 hidden -translate-x-1/2 transform items-center gap-1 lg:flex">
			{#each navLinks as link}
				<a href={link.href} class={linkClasses(link.href)}>{link.label}</a>
			{/each}
		</div>
		
		<!-- Right: Theme Toggle, Audio Mute, Logout, Mobile Menu -->
		<div class="ml-auto flex items-center gap-2 md:gap-3">
			<!-- Theme Toggle -->
			<ThemeToggle />
			
			<!-- Audio Mute Button (only visible in midnight mode) -->
			<AudioMuteButton />
			
			{#if $auth.isLoggedIn}
				<button
					class="hidden items-center rounded-xl border border-red-500/40 bg-red-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 lg:inline-flex"
					onclick={handleLogout}
				>
					Logout
				</button>
			{/if}
			<button
				class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900/90 text-zinc-100 shadow-sm ring-1 ring-white/10 transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 lg:hidden"
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
			class="absolute inset-0 cursor-pointer bg-black/80"
			aria-label="Close menu"
			onclick={closeMenu}
		></button>
		<div
			class="absolute left-4 right-4 top-24 space-y-3 rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl shadow-black/40 ring-1 ring-white/5"
		>
			<div class="space-y-1">
				{#each navLinks as link}
					<a
						href={link.href}
						class={`block rounded-xl px-4 py-3 text-base font-semibold transition ${
							activeUrl === link.href || activeUrl.startsWith(link.href + '/')
								? 'bg-violet-600/25 text-violet-100 ring-1 ring-violet-500/35'
								: 'text-zinc-100 hover:bg-white/[0.06]'
						}`}
						onclick={closeMenu}
					>
						{link.label}
					</a>
				{/each}
			</div>
			{#if $auth.isLoggedIn}
				<button
					class="w-full rounded-xl bg-red-600/90 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
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

	<div class="relative z-10 min-h-0 overflow-x-clip">
		{#key page.url.pathname}
			{@render children()}
		{/key}
	</div>
</div>

