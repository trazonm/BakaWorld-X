<svelte:head>
	<title>Brain - BakaWorld χ</title>
</svelte:head>

<main class="flex flex-1 w-full flex-col bg-gray-900/95">
	<p class="px-4 py-3 text-sm text-gray-400">
		<a
			href="https://bakaserver.gleeze.com"
			target="_blank"
			rel="noopener noreferrer"
			class="text-blue-400 underline"
		>Open BakaServer</a>
		if the frame below does not load.
	</p>
	<iframe
		id="serverIframe"
		title="BakaServer"
		src="https://bakaserver.gleeze.com"
		class="w-full h-full min-h-[80vh] max-h-[100vh] rounded-lg border border-gray-800 shadow-lg bg-white"
		allowfullscreen
	></iframe>
</main>
