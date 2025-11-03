<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	let showLogin = false;
	let showSignup = false;

	// Redirect to /home if already logged in
	onMount(async () => {
		await refreshAuth();
		const { isLoggedIn } = get(auth);
		if (isLoggedIn) {
			goto('/home');
		}
	});

	function openLogin() {
		showLogin = true;
		showSignup = false;
	}
	function openSignup() {
		showSignup = true;
		showLogin = false;
	}
	function closeModal() {
		showLogin = false;
		showSignup = false;
	}
</script>

<main
	class="flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center"
>
	<div class="flex flex-col items-center mb-40">
		<h1 class="mt-12 mb-8 text-4xl font-extrabold text-white drop-shadow-lg">BakaWorld χ</h1>
		<div class="flex gap-6">
			<button
				class="rounded bg-blue-700 px-6 py-2 font-semibold text-white shadow-md hover:bg-blue-800"
				on:click={openLogin}>Login</button
			>
			<button
				class="rounded bg-green-700 px-6 py-2 font-semibold text-white shadow-md hover:bg-green-800"
				on:click={openSignup}>Sign Up</button
			>
		</div>
	</div>
</main>

{#if showLogin}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
		<div
			class="relative w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-8 shadow-2xl"
		>
			<button
				class="absolute top-2 right-2 text-2xl text-gray-400 hover:text-white"
				on:click={closeModal}>&times;</button
			>
			<h2 class="mb-4 text-2xl font-bold text-white">Login</h2>
			<form
				on:submit|preventDefault={async (e) => {
					const form = e.target as HTMLFormElement;
					const formData = new FormData(form);
					const res = await fetch('/api/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include', // Include cookies in request
						body: JSON.stringify({
							username: formData.get('username'),
							password: formData.get('password')
						})
					});
					const data = await res.json();
					if (data.success) {
						// Wait a brief moment for cookie to be set, then refresh auth
						await new Promise(resolve => setTimeout(resolve, 100));
						await refreshAuth();
						// Use window.location for a full page reload to ensure cookie is read
						window.location.href = '/home';
					} else {
						alert(data.message || 'Login failed');
					}
				}}
				class="flex flex-col gap-4"
			>
				<input
					name="username"
					type="text"
					placeholder="Username"
					class="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
					required
				/>
				<input
					name="password"
					type="password"
					placeholder="Password"
					class="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
					required
				/>
				<button
					type="submit"
					class="rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
					>Login</button
				>
			</form>
		</div>
	</div>
{/if}

{#if showSignup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
		<div
			class="relative w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-8 shadow-2xl"
		>
			<button
				class="absolute top-2 right-2 text-2xl text-gray-400 hover:text-white"
				on:click={closeModal}>&times;</button
			>
			<h2 class="mb-4 text-2xl font-bold text-white">Sign Up</h2>
			<form
				on:submit|preventDefault={async (e) => {
					const form = e.target as HTMLFormElement;
					const formData = new FormData(form);
					const username = formData.get('username') as string;
					const password = formData.get('password') as string;
					const confirm = formData.get('confirm') as string;
					const passwordRegex =
						/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]).{8,}$/;
					if (!passwordRegex.test(password)) {
						alert(
							'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.'
						);
						return;
					}
					if (password !== confirm) {
						alert('Passwords do not match.');
						return;
					}
					const res = await fetch('/api/auth/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ username, password })
					});
					const data = await res.json();
					if (res.ok) {
						alert('Registration successful! Please log in.');
						closeModal();
						openLogin();
					} else {
						alert(data.error || 'Registration failed');
					}
				}}
				class="flex flex-col gap-4"
			>
				<input
					name="username"
					type="text"
					placeholder="Username"
					class="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
					required
				/>
				<input
					name="password"
					type="password"
					placeholder="Password"
					class="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
					required
				/>
				<input
					name="confirm"
					type="password"
					placeholder="Confirm Password"
					class="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none"
					required
				/>
				<div class="mb-2 text-xs text-gray-400">
					Password must be at least 8 characters, include uppercase, lowercase, number, and special
					character.
				</div>
				<button
					type="submit"
					class="rounded bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
					>Sign Up</button
				>
			</form>
		</div>
	</div>
{/if}
