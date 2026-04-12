<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, refreshAuth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	let showLogin = false;
	let showSignup = false;
	let recaptchaSiteKey = '';
	let recaptchaLoaded = false;
	let loginLoading = false;
	let loginError = '';

	function loadRecaptchaScript() {
		return new Promise<void>((resolve, reject) => {
			if (typeof window !== 'undefined' && (window as any).grecaptcha) {
				recaptchaLoaded = true;
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
			script.async = true;
			script.defer = true;
			script.onload = () => {
				recaptchaLoaded = true;
				resolve();
			};
			script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
			document.head.appendChild(script);
		});
	}

	async function getRecaptchaToken(): Promise<string> {
		if (!recaptchaLoaded || !(window as any).grecaptcha) {
			throw new Error('reCAPTCHA not loaded');
		}

		try {
			const token = await (window as any).grecaptcha.execute(recaptchaSiteKey, { action: 'login' });
			return token;
		} catch (error) {
			console.error('reCAPTCHA token generation failed:', error);
			throw error;
		}
	}

	onMount(async () => {
		await refreshAuth();
		const { isLoggedIn } = get(auth);
		if (isLoggedIn) {
			goto('/home');
		}

		try {
			const res = await fetch('/api/auth/recaptcha-key');
			const data = await res.json();
			if (data.siteKey) {
				recaptchaSiteKey = data.siteKey;
				await loadRecaptchaScript();
			}
		} catch (error) {
			console.error('Failed to load reCAPTCHA:', error);
		}
	});

	function openLogin() {
		showLogin = true;
		showSignup = false;
		loginError = '';
		loginLoading = false;
	}
	function openSignup() {
		showSignup = true;
		showLogin = false;
	}
	function closeModal() {
		showLogin = false;
		showSignup = false;
		loginError = '';
		loginLoading = false;
	}
</script>

<main
	class="flex min-h-[calc(100vh-5rem)] w-full flex-col items-center justify-center px-4 py-16"
>
	<div class="w-full max-w-lg text-center">
		<p class="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">BakaWorld</p>
		<h1
			class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
		>
			BakaWorld <span class="text-theme-accent">χ</span>
		</h1>
		<p class="mx-auto mb-10 max-w-md text-sm leading-relaxed text-zinc-400 md:text-base">
			Anime, manga, comics, and your queue — one place.
		</p>
		<div class="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
			<button
				type="button"
				class="min-h-[48px] rounded-xl bg-violet-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 active:translate-y-px"
				on:click={openLogin}>Log in</button
			>
			<button
				type="button"
				class="min-h-[48px] rounded-xl border border-white/15 bg-white/[0.04] px-8 py-3 text-base font-semibold text-zinc-100 transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:translate-y-px"
				on:click={openSignup}>Create account</button
			>
		</div>
	</div>
</main>

{#if showLogin}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<div
			class="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5"
		>
			<button
				class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
				on:click={closeModal}>&times;</button
			>
			<h2 class="mb-6 text-2xl font-bold tracking-tight text-white">Log in</h2>

			{#if loginError}
				<div
					class="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200"
				>
					{loginError}
				</div>
			{/if}

			<form
				on:submit|preventDefault={async (e) => {
					if (loginLoading) return;

					loginLoading = true;
					loginError = '';

					const form = e.target as HTMLFormElement;
					const formData = new FormData(form);

					let recaptchaToken = '';
					try {
						recaptchaToken = await getRecaptchaToken();
					} catch (error) {
						console.error('reCAPTCHA error:', error);
						loginError = 'Security verification failed. Please refresh the page and try again.';
						loginLoading = false;
						return;
					}

					try {
						const res = await fetch('/api/auth/login', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							credentials: 'include',
							body: JSON.stringify({
								username: formData.get('username'),
								password: formData.get('password'),
								recaptchaToken
							})
						});
						const data = await res.json();
						if (data.success) {
							await new Promise((resolve) => setTimeout(resolve, 100));
							await refreshAuth();
							window.location.href = '/home';
						} else {
							loginError = data.message || 'Login failed';
							loginLoading = false;
						}
					} catch (error) {
						console.error('Login error:', error);
						loginError = 'Network error. Please try again.';
						loginLoading = false;
					}
				}}
				class="flex flex-col gap-4"
			>
				<input
					name="username"
					type="text"
					placeholder="Username"
					class="min-h-[48px] rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
					required
					disabled={loginLoading}
				/>
				<input
					name="password"
					type="password"
					placeholder="Password"
					class="min-h-[48px] rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
					required
					disabled={loginLoading}
				/>
				<button
					type="submit"
					class="mt-2 flex min-h-[48px] items-center justify-center rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={loginLoading}
				>
					{#if loginLoading}
						<svg
							class="mr-2 h-5 w-5 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Logging in…
					{:else}
						Continue
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

{#if showSignup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<div
			class="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-8 shadow-2xl shadow-black/50 ring-1 ring-white/5"
		>
			<button
				class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
				on:click={closeModal}>&times;</button
			>
			<h2 class="mb-6 text-2xl font-bold tracking-tight text-white">Create account</h2>
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
					class="min-h-[48px] rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
					required
				/>
				<input
					name="password"
					type="password"
					placeholder="Password"
					class="min-h-[48px] rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
					required
				/>
				<input
					name="confirm"
					type="password"
					placeholder="Confirm password"
					class="min-h-[48px] rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
					required
				/>
				<p class="text-xs leading-relaxed text-zinc-500">
					Password must be at least 8 characters and include uppercase, lowercase, number, and special
					character.
				</p>
				<button
					type="submit"
					class="mt-1 min-h-[48px] rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
					>Sign up</button
				>
			</form>
		</div>
	</div>
{/if}
