<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { onDestroy, tick } from 'svelte';
	import type { PageData } from './$types';
	import { movieWatchPath } from '$lib/utils/moviePaths';

	export let data: PageData;

	let episodeTransitionStarted = false;

	function isMoviesWatchPath(pathname: string | undefined): boolean {
		return !!pathname && pathname.includes('/movies/') && pathname.includes('/watch/');
	}

	$: episodeNavigationPending =
		browser &&
		(episodeTransitionStarted ||
			($navigating !== null && isMoviesWatchPath($navigating.to?.url.pathname)));

	let videoData = data.videoData;
	let selectedServer = data.initialServer;

	$: {
		videoData = data.videoData;
		selectedServer = data.initialServer;
	}
	let loadError = '';
	let switching = false;

	let videoEl: HTMLVideoElement | undefined;
	let detachHls: (() => void) | null = null;
	let hlsRequestId = 0;

	$: movie = data.movie;
	$: episode = data.episode;
	$: mediaId = data.mediaId;
	$: detailHref = `/movies/${mediaId.split('/').map(encodeURIComponent).join('/')}`;

	$: embedUrl =
		videoData?.playback === 'embed'
			? (videoData.embedUrl || videoData.sources?.[0]?.url || '')
			: '';

	/** Provider watch URL from catalog metadata (correct referer when opened on their origin). Not every build includes episode.url. */
	$: providerWatchPageUrl = (() => {
		const epU = episode.url?.trim();
		if (epU && /^https?:\/\//i.test(epU)) return epU;
		const movU = movie.url?.trim();
		if (movU && /^https?:\/\//i.test(movU)) return movU;
		return '';
	})();

	$: hlsPlaylistUrl =
		videoData?.playback === 'hls'
			? (videoData.sources?.find((s: { isM3U8?: boolean }) => s.isM3U8)?.url ??
				videoData.sources?.[0]?.url ??
				'')
			: '';

	async function applyServer(server: string) {
		if (!browser || !server || switching) return;
		switching = true;
		loadError = '';
		try {
			const u = new URL('/api/movies/watch', window.location.origin);
			u.searchParams.set('episodeId', data.episodeId);
			u.searchParams.set('mediaId', data.mediaId);
			u.searchParams.set('server', server);
			u.searchParams.set('single', '1');
			const r = await fetch(u);
			const body = await r.json().catch(() => ({}));
			if (!r.ok) throw new Error((body as { error?: string }).error || r.statusText);
			videoData = body;
			const su = (body as { serverUsed?: string }).serverUsed;
			selectedServer =
				su && ['vidcloud', 'upcloud', 'mixdrop'].includes(su) ? su : server;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Playback error';
		} finally {
			switching = false;
		}
	}

	$: if (browser && embedUrl) {
		detachHls?.();
		detachHls = null;
	}

	$: if (browser && !embedUrl) {
		const url = hlsPlaylistUrl;
		if (!url) {
			detachHls?.();
			detachHls = null;
		} else {
			const req = ++hlsRequestId;
			tick().then(async () => {
				if (req !== hlsRequestId || !videoEl) return;
				detachHls?.();
				detachHls = null;
				const el = videoEl;
				const Hls = (await import('hls.js')).default;
				if (Hls.isSupported()) {
					const hls = new Hls({ enableWorker: true });
					hls.loadSource(url);
					hls.attachMedia(el);
					detachHls = () => hls.destroy();
				} else if (el.canPlayType('application/vnd.apple.mpegurl')) {
					el.src = url;
					detachHls = () => {
						el.removeAttribute('src');
						el.load();
					};
				}
			});
		}
	}

	onDestroy(() => detachHls?.());

	function goEpisode(id: string) {
		if (!browser || episodeNavigationPending) return;
		episodeTransitionStarted = true;
		void goto(movieWatchPath(mediaId, id)).finally(() => {
			episodeTransitionStarted = false;
		});
	}
</script>

<svelte:head>
	<title>{episode.title} — {movie.title} — Movies &amp; TV — BakaWorld χ</title>
</svelte:head>

{#if episodeNavigationPending}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
		aria-busy="true"
		aria-live="polite"
	>
		<div
			class="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-amber-500/25 bg-gray-950/95 px-8 py-6 text-center shadow-xl"
		>
			<div
				class="h-11 w-11 animate-spin rounded-full border-[3px] border-amber-500/25 border-t-amber-500"
				role="status"
				aria-label="Loading"
			></div>
			<p class="text-sm font-medium text-white">Loading episode…</p>
		</div>
	</div>
{/if}

<div class="container mx-auto max-w-5xl px-4 py-8">
	<a href={detailHref} class="mb-4 inline-block text-sm text-amber-400 hover:text-amber-300">
		← {movie.title}
	</a>

	<h1 class="mb-2 text-2xl font-bold text-white">{episode.title}</h1>
	<p class="mb-6 text-sm text-gray-500">{movie.title}</p>

	<div class="mb-4 flex flex-wrap items-center gap-3">
		<label class="flex items-center gap-2 text-sm text-gray-300">
			<span>Server</span>
			<select
				class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
				value={selectedServer}
				disabled={switching || episodeNavigationPending}
				on:change={(e) => applyServer((e.currentTarget as HTMLSelectElement).value)}
			>
				{#each data.serverOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		{#if switching}
			<span class="text-sm text-amber-200/90">Switching…</span>
		{/if}
	</div>

	{#if data.watchError}
		<p class="mb-4 rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
			{data.watchError} Try another server below.
		</p>
	{/if}
	{#if loadError}
		<p class="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
			{loadError}
		</p>
	{/if}

	<div class="overflow-hidden rounded-xl border border-gray-800 bg-black shadow-xl">
		{#if embedUrl}
			{#key `${selectedServer}::${embedUrl}`}
				<iframe
					title="Playback"
					src={embedUrl}
					class="aspect-video h-[min(70vh,600px)] w-full"
					allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
					allowfullscreen
					referrerpolicy="origin"
				></iframe>
			{/key}
		{:else}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video
				bind:this={videoEl}
				class="aspect-video w-full"
				controls
				playsinline
				crossorigin="anonymous"
			>
				{#if videoData?.subtitles?.length}
					{#each videoData.subtitles as sub, i (sub.lang + i)}
						<track kind="subtitles" src={sub.url} srclang={sub.lang} label={sub.lang} />
					{/each}
				{/if}
			</video>
		{/if}
	</div>

	{#if providerWatchPageUrl || embedUrl}
		<div class="mt-3 space-y-2 text-center text-sm text-gray-400">
			{#if providerWatchPageUrl}
				<p>
					<a
						href={providerWatchPageUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium text-amber-400 underline hover:text-amber-300"
					>
						Open this title on the source site
					</a>
					<span class="text-gray-500"> — most reliable when embeds show errors on this domain.</span>
				</p>
			{/if}
			{#if embedUrl}
				<p>
					<span class="text-gray-500">Or</span>
					<a
						href={embedUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-amber-400 underline hover:text-amber-300"
					>
						open the embed player in a new tab
					</a>
					<span class="text-gray-500">.</span>
				</p>
			{/if}
		</div>
	{/if}

	<div class="mt-6 flex flex-wrap justify-between gap-3">
		<button
			type="button"
			class="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white transition duration-150 ease-out hover:border-amber-500/45 hover:bg-gray-800 hover:text-amber-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:bg-gray-900 disabled:hover:text-white disabled:active:scale-100"
			disabled={!data.prevEpisode || episodeNavigationPending}
			on:click={() => data.prevEpisode && goEpisode(data.prevEpisode.id)}
		>
			← Previous
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-lg border border-amber-800/40 bg-amber-950/25 px-4 py-2 text-sm text-amber-50/95 transition duration-150 ease-out hover:border-amber-500/55 hover:bg-amber-950/55 hover:text-amber-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-900 disabled:text-white disabled:opacity-40 disabled:hover:border-gray-700 disabled:hover:bg-gray-900 disabled:hover:text-white disabled:active:scale-100"
			disabled={!data.nextEpisode || episodeNavigationPending}
			on:click={() => data.nextEpisode && goEpisode(data.nextEpisode.id)}
		>
			Next →
		</button>
	</div>
</div>
