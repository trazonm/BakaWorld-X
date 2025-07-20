<script>
	import { onMount } from 'svelte';
	import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Button } from 'flowbite-svelte';
	import { page } from '$app/state';
	import logo from '$lib/assets/logo.png';
	import { goto } from '$app/navigation';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import '../app.css';
	export const slots = ['content'];

	let activeClass = 'text-blue-400 md:text-blue-400 hover:text-blue-200 md:hover:text-blue-200'; // active = blue
	let nonActiveClass = 'text-gray-400 hover:text-blue-400 md:hover:text-blue-400'; // default = gray, hover = blue

	let activeUrl = $derived(page.url.pathname);
	let { children } = $props();

	onMount(async () => {
		await refreshAuth();
	});

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		auth.set({ isLoggedIn: false, username: '' });
		goto('/');
	}
</script>
	<Navbar
		class="flex items-center text-white shadow-none"
		closeOnClickOutside={true}
	>
		<div class="flex flex-1 items-center justify-start">
			<NavBrand href="/" class="text-white">
				<img src={logo} class="me-3 h-6 sm:h-20" alt="BakaWorld Logo" />
				<span class="self-center text-xl font-semibold whitespace-nowrap text-white">
					BakaWorld χ
				</span>
			</NavBrand>
		</div>
		<div class="flex flex-1 items-center justify-center">
			<NavUl class="order-1 0 text-white">
				<NavLi href="/home" class={activeUrl === '/home' ? activeClass : nonActiveClass}>Home</NavLi
				>
				<NavLi href="/downloads" class={activeUrl === '/downloads' ? activeClass : nonActiveClass}
					>Downloads</NavLi
				>
				<NavLi href="/anime" class={activeUrl === '/anime' ? activeClass : nonActiveClass}
					>Anime</NavLi
				>
				<NavLi href="/manga" class={activeUrl === '/manga' ? activeClass : nonActiveClass}
					>Manga</NavLi
				>
				<NavLi href="/comics" class={activeUrl === '/comics' ? activeClass : nonActiveClass}
					>Comics</NavLi
				>				
				<NavLi href="/brain" class={activeUrl === '/brain' ? activeClass : nonActiveClass}
					>Brain</NavLi
				>
			</NavUl>
		</div>
		<div class="flex flex-1 items-center justify-end md:order-2">
			{#if $auth.isLoggedIn}
				<button
					class="rounded border border-red-900 bg-red-700 px-4 py-2 font-semibold text-white shadow hover:bg-red-800"
					onclick={handleLogout}
					>Logout
				</button>
			{/if}
			<NavHamburger class="bg-gray-950 p-2 hover:bg-zinc-800 hover:text-white" />
		</div>
	</Navbar>

	{@render children()}
