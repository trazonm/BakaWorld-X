<script lang="ts">
	import type { PageData } from './$types';
	import { navigating } from '$app/stores';
	import { movieWatchPath } from '$lib/utils/moviePaths';

	export let data: PageData;

	$: movie = data.movie;
	$: searchQuery = data.searchQuery || '';
	$: mediaId = data.mediaId;
	$: backUrl = searchQuery ? `/movies?query=${encodeURIComponent(searchQuery)}` : '/movies';

	$: referer = (() => {
		try {
			return movie.url ? new URL(movie.url).origin + '/' : 'https://flixhq.to/';
		} catch {
			return 'https://flixhq.to/';
		}
	})();

	$: poster = movie.image
		? `/api/proxy/image?url=${encodeURIComponent(movie.image)}&referer=${encodeURIComponent(referer)}`
		: '';

	$: genres = movie.genres?.length ? movie.genres : movie.geners || [];

	$: episodes = movie.episodes || [];

	$: isTvSeries =
		(mediaId || '').toLowerCase().includes('tv/') ||
		(movie.type || '').toLowerCase().includes('tv');

	$: episodesBySeason = (() => {
		const m = new Map<number, typeof episodes>();
		for (const ep of episodes) {
			const s = ep.season ?? 0;
			if (!m.has(s)) m.set(s, []);
			m.get(s)!.push(ep);
		}
		for (const list of m.values()) {
			list.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
		}
		return [...m.entries()].sort((a, b) => a[0] - b[0]);
	})();

	$: isNavigating = !!$navigating;
</script>

<svelte:head>
	<title>{movie.title} — Movies &amp; TV — BakaWorld χ</title>
	<meta name="description" content={movie.description || `Watch ${movie.title}`} />
</svelte:head>

{#if isNavigating}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm"
	>
		<div
			class="h-14 w-14 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-500"
		></div>
		<p class="text-white">Loading…</p>
	</div>
{/if}

<div class="container mx-auto max-w-5xl px-4 py-10">
	<a href={backUrl} class="mb-4 inline-block text-sm text-amber-400 hover:text-amber-300"
		>← Back to Movies &amp; TV</a
	>

	<div class="flex flex-col gap-8 md:flex-row md:items-start">
		{#if poster}
			<img
				src={poster}
				alt=""
				class="mx-auto w-48 shrink-0 rounded-xl border border-gray-800 shadow-lg md:mx-0 md:w-56"
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<h1 class="mb-2 text-3xl font-bold text-white">{movie.title}</h1>
			<div class="mb-3 flex flex-wrap gap-2 text-sm text-gray-400">
				{#if movie.type}
					<span class="rounded bg-gray-800 px-2 py-0.5 text-gray-200">{movie.type}</span>
				{/if}
				{#if movie.releaseDate}
					<span>{movie.releaseDate}</span>
				{/if}
				{#if movie.duration}
					<span>{movie.duration}</span>
				{/if}
			</div>
			{#if genres.length}
				<p class="mb-3 text-sm text-gray-500">{genres.join(' · ')}</p>
			{/if}
			{#if movie.description}
				<p class="text-gray-300">{movie.description}</p>
			{/if}
		</div>
	</div>

	<section class="mt-10">
		<h2 class="mb-4 text-xl font-semibold text-white">
			{isTvSeries ? 'Episodes by season' : 'Episodes'}
		</h2>
		{#if episodes.length === 0}
			<p class="text-gray-500">No episodes listed. This title may be a single stream — check the provider.</p>
		{:else if isTvSeries && episodes.length > 1}
			<div class="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
				{#each episodesBySeason as [seasonNum, eps] (seasonNum)}
					<div>
						<h3 class="sticky top-0 z-[1] mb-2 bg-gray-950/95 py-1 text-lg font-medium text-amber-200/90">
							Season {seasonNum}
						</h3>
						<ul class="grid gap-2 sm:grid-cols-2">
							{#each eps as ep (ep.id)}
								<li>
									<a
										href={movieWatchPath(mediaId, ep.id)}
										class="block rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-600/50 hover:bg-gray-900"
									>
										<span class="font-medium text-white">{ep.title}</span>
										<span class="ml-2 text-xs text-gray-500">S{seasonNum} · E{ep.number}</span>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{:else}
			<ul class="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2">
				{#each episodes as ep (ep.id)}
					<li>
						<a
							href={movieWatchPath(mediaId, ep.id)}
							class="block rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2 text-sm text-gray-200 transition hover:border-amber-600/50 hover:bg-gray-900"
						>
							<span class="font-medium text-white">{ep.title}</span>
							{#if ep.season != null}
								<span class="ml-2 text-xs text-gray-500">S{ep.season} · E{ep.number}</span>
							{:else}
								<span class="ml-2 text-xs text-gray-500">#{ep.number}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
