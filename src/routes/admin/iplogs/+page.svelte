<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let { logs, username } = data;
	$: ({ logs, username } = data);

	// Filter and search state
	let searchQuery = '';
	let countryFilter = 'all';
	let sortBy: 'timestamp' | 'ip' | 'location' = 'timestamp';
	let sortDirection: 'asc' | 'desc' = 'desc';
	let itemsPerPage = 50;
	let currentPage = 1;

	// Extract unique countries from logs
	$: countries = Array.from(
		new Set(
			logs
				.map((log) => {
					const match = log.location.match(/([A-Z]{2})\s?\d*$/);
					return match ? match[1] : null;
				})
				.filter(Boolean)
		)
	).sort() as string[];

	// Filtered and sorted logs
	$: filteredLogs = logs
		.filter((log) => {
			// Search filter
			if (searchQuery) {
				const search = searchQuery.toLowerCase();
				return (
					log.ip.toLowerCase().includes(search) || log.location.toLowerCase().includes(search)
				);
			}
			return true;
		})
		.filter((log) => {
			// Country filter
			if (countryFilter !== 'all') {
				const match = log.location.match(/([A-Z]{2})\s?\d*$/);
				const country = match ? match[1] : null;
				return country === countryFilter;
			}
			return true;
		})
		.sort((a, b) => {
			let compareValue = 0;
			if (sortBy === 'timestamp') {
				compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
			} else if (sortBy === 'ip') {
				compareValue = a.ip.localeCompare(b.ip);
			} else if (sortBy === 'location') {
				compareValue = a.location.localeCompare(b.location);
			}
			return sortDirection === 'asc' ? compareValue : -compareValue;
		});

	// Pagination
	$: totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
	$: paginatedLogs = filteredLogs.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	// Stats
	$: totalIps = logs.length;
	$: uniqueCountries = countries.length;
	$: filteredCount = filteredLogs.length;

	function changePage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function toggleSort(field: typeof sortBy) {
		if (sortBy === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = field;
			sortDirection = 'desc';
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getCountryFlag(location: string): string {
		const match = location.match(/([A-Z]{2})\s?\d*$/);
		const countryCode = match ? match[1] : null;
		if (!countryCode) return '🌍';
		
		// Convert country code to flag emoji
		const codePoints = countryCode
			.toUpperCase()
			.split('')
			.map(char => 127397 + char.charCodeAt(0));
		return String.fromCodePoint(...codePoints);
	}

	// Reset to page 1 when filters change
	$: {
		searchQuery;
		countryFilter;
		currentPage = 1;
	}
</script>

<svelte:head>
	<title>IP Logs - Admin Console</title>
</svelte:head>

<div class="min-h-screen py-4 md:py-8 px-2 md:px-4" style="background: linear-gradient(to bottom right, var(--theme-bg-primary), var(--theme-bg-secondary), var(--theme-bg-primary));">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-4 md:mb-8">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
				<div class="flex-1">
					<h1 class="text-2xl md:text-4xl font-bold text-white mb-2">
						🌍 IP Logs Console
					</h1>
					<p class="text-sm md:text-base text-gray-400">Logged in as <span class="text-blue-400 font-semibold">{username}</span></p>
				</div>
				<div class="flex flex-col sm:flex-row gap-2">
					<a href="/admin" class="px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm md:text-base text-center">
						Admin Dashboard
					</a>
					<a href="/home" class="px-3 md:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm md:text-base text-center">
						← Home
					</a>
				</div>
			</div>

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
				<div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 md:p-6 shadow-lg">
					<div class="text-blue-100 text-xs md:text-sm font-medium mb-1">Total IPs Logged</div>
					<div class="text-white text-2xl md:text-3xl font-bold">{totalIps.toLocaleString()}</div>
				</div>
				<div class="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 md:p-6 shadow-lg">
					<div class="text-green-100 text-xs md:text-sm font-medium mb-1">Unique Countries</div>
					<div class="text-white text-2xl md:text-3xl font-bold">{uniqueCountries}</div>
				</div>
				<div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 md:p-6 shadow-lg">
					<div class="text-purple-100 text-xs md:text-sm font-medium mb-1">Filtered Results</div>
					<div class="text-white text-2xl md:text-3xl font-bold">{filteredCount.toLocaleString()}</div>
				</div>
			</div>

			<!-- Filters -->
			<div class="backdrop-blur-sm rounded-lg p-3 md:p-6 shadow-lg border" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
					<!-- Search -->
					<div>
						<label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">
							🔍 Search
						</label>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search IP or location..."
							class="w-full bg-gray-900 text-white px-3 md:px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
						/>
					</div>

					<!-- Country Filter -->
					<div>
						<label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">
							🌐 Country
						</label>
						<select
							bind:value={countryFilter}
							class="w-full bg-gray-900 text-white px-3 md:px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
						>
							<option value="all">All Countries</option>
							{#each countries as country}
								<option value={country}>{country}</option>
							{/each}
						</select>
					</div>

					<!-- Items Per Page -->
					<div>
						<label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">
							📄 Items Per Page
						</label>
						<select
							bind:value={itemsPerPage}
							class="w-full bg-gray-900 text-white px-3 md:px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm md:text-base"
						>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
							<option value={250}>250</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile: Card View -->
		<div class="md:hidden space-y-3">
			{#each paginatedLogs as log (log.id)}
				<div class="backdrop-blur-sm rounded-lg border p-4 shadow-lg" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
					<div class="mb-3">
						<div class="text-xs text-gray-400 mb-1">IP Address</div>
						<div class="font-mono text-sm text-blue-400">{log.ip}</div>
					</div>
					<div class="mb-3">
						<div class="text-xs text-gray-400 mb-1">Location</div>
						<div class="flex items-center gap-2">
							<span class="text-xl">{getCountryFlag(log.location)}</span>
							<span class="text-sm text-gray-300 break-words">{log.location}</span>
						</div>
					</div>
					<div>
						<div class="text-xs text-gray-400 mb-1">First Seen</div>
						<div class="text-sm text-gray-400">{formatDate(log.timestamp)}</div>
					</div>
				</div>
			{:else}
				<div class="backdrop-blur-sm rounded-lg border p-8 text-center" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
					<p style="color: var(--theme-text-secondary);">No IP logs found matching your filters.</p>
				</div>
			{/each}
		</div>

		<!-- Desktop: Table View -->
		<div class="hidden md:block backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b" style="background-color: var(--theme-bg-primary); border-color: var(--theme-border);">
						<tr>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left">
								<button
									on:click={() => toggleSort('ip')}
									class="flex items-center gap-2 text-xs md:text-sm font-semibold text-gray-300 hover:text-white transition-colors"
								>
									IP Address
									{#if sortBy === 'ip'}
										<span class="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left">
								<button
									on:click={() => toggleSort('location')}
									class="flex items-center gap-2 text-xs md:text-sm font-semibold text-gray-300 hover:text-white transition-colors"
								>
									Location
									{#if sortBy === 'location'}
										<span class="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</th>
							<th class="px-4 lg:px-6 py-3 md:py-4 text-left">
								<button
									on:click={() => toggleSort('timestamp')}
									class="flex items-center gap-2 text-xs md:text-sm font-semibold text-gray-300 hover:text-white transition-colors"
								>
									First Seen
									{#if sortBy === 'timestamp'}
										<span class="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y" style="border-color: var(--theme-border);">
						{#each paginatedLogs as log (log.id)}
							<tr class="admin-table-row transition-colors">
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<div class="font-mono text-xs md:text-sm text-blue-400">{log.ip}</div>
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<div class="flex items-center gap-2">
										<span class="text-xl md:text-2xl">{getCountryFlag(log.location)}</span>
										<span class="text-xs md:text-sm text-gray-300">{log.location}</span>
									</div>
								</td>
								<td class="px-4 lg:px-6 py-3 md:py-4">
									<div class="text-xs md:text-sm text-gray-400">{formatDate(log.timestamp)}</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="px-6 py-12 text-center" style="color: var(--theme-text-secondary);">
									No IP logs found matching your filters.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="border-t px-3 md:px-6 py-3 md:py-4" style="background-color: var(--theme-bg-primary); border-color: var(--theme-border);">
					<div class="flex flex-col sm:flex-row items-center justify-between gap-3">
						<div class="text-xs md:text-sm text-gray-400 text-center sm:text-left">
							Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCount)} of {filteredCount} results
						</div>
						<div class="flex gap-1 md:gap-2 flex-wrap justify-center">
							<button
								on:click={() => changePage(1)}
								disabled={currentPage === 1}
								class="px-2 md:px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
							>
								««
							</button>
							<button
								on:click={() => changePage(currentPage - 1)}
								disabled={currentPage === 1}
								class="px-2 md:px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
							>
								«
							</button>
							
							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
								return start + i;
							}) as page}
								<button
									on:click={() => changePage(page)}
									class="px-2 md:px-3 py-1 rounded transition-colors text-xs md:text-sm {currentPage === page 
										? 'bg-blue-600 text-white' 
										: 'bg-gray-700 text-white hover:bg-gray-600'}"
								>
									{page}
								</button>
							{/each}

							<button
								on:click={() => changePage(currentPage + 1)}
								disabled={currentPage === totalPages}
								class="px-2 md:px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
							>
								»
							</button>
							<button
								on:click={() => changePage(totalPages)}
								disabled={currentPage === totalPages}
								class="px-2 md:px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
							>
								»»
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom scrollbar for dark theme */
	:global(body) {
		scrollbar-width: thin;
		scrollbar-color: #4b5563 #1f2937;
	}

	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}

	:global(::-webkit-scrollbar-track) {
		background: #1f2937;
	}

	:global(::-webkit-scrollbar-thumb) {
		background: #4b5563;
		border-radius: 4px;
	}

	:global(::-webkit-scrollbar-thumb:hover) {
		background: #6b7280;
	}
</style>

