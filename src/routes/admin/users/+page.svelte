<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let { users, adminUsername } = data;
	$: ({ users, adminUsername } = data);

	// Filter and search state
	let searchQuery = '';
	let showResetModal = false;
	let showDeleteModal = false;
	let selectedUser = '';
	let newPassword = '';
	let confirmPassword = '';
	let showPassword = false;
	let isSubmitting = false;

	// Password requirements
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]).{8,}$/;

	// Filtered users
	$: filteredUsers = users.filter((user) => {
		if (searchQuery) {
			return user.username.toLowerCase().includes(searchQuery.toLowerCase());
		}
		return true;
	});

	function openResetModal(username: string) {
		selectedUser = username;
		newPassword = '';
		confirmPassword = '';
		showPassword = false;
		showResetModal = true;
	}

	function openDeleteModal(username: string) {
		selectedUser = username;
		showDeleteModal = true;
	}

	function closeModals() {
		showResetModal = false;
		showDeleteModal = false;
		selectedUser = '';
		newPassword = '';
		confirmPassword = '';
		showPassword = false;
	}

	function generateRandomPassword() {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
		let password = '';
		// Ensure at least one of each required character type
		password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
		password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
		password += '0123456789'[Math.floor(Math.random() * 10)];
		password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
		// Fill the rest
		for (let i = 4; i < 12; i++) {
			password += chars[Math.floor(Math.random() * chars.length)];
		}
		// Shuffle the password
		newPassword = password.split('').sort(() => Math.random() - 0.5).join('');
		confirmPassword = newPassword;
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		alert('Password copied to clipboard!');
	}

	$: passwordValid = passwordRegex.test(newPassword);
	$: passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
</script>

<svelte:head>
	<title>User Management - Admin Console</title>
</svelte:head>

<div class="min-h-screen py-8 px-4" style="background: linear-gradient(to bottom right, var(--theme-bg-primary), var(--theme-bg-secondary), var(--theme-bg-primary));">
	<div class="mx-auto max-w-6xl">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h1 class="text-4xl font-bold text-white mb-2">
						👥 User Management
					</h1>
					<p class="text-gray-400">Logged in as <span class="text-blue-400 font-semibold">{adminUsername}</span></p>
				</div>
				<div class="flex gap-3">
					<a href="/admin" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
						Admin Dashboard
					</a>
					<a href="/home" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
						← Home
					</a>
				</div>
			</div>

			<!-- Stats Card -->
			<div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 shadow-lg mb-6">
				<div class="text-purple-100 text-sm font-medium mb-1">Total Users</div>
				<div class="text-white text-3xl font-bold">{users.length}</div>
			</div>

			<!-- Success/Error Messages -->
			{#if form?.success}
				<div class="mb-6 rounded-lg bg-green-900/50 border border-green-700 px-4 py-3 text-green-200">
					✓ {form.message}
				</div>
			{/if}
			{#if form?.error}
				<div class="mb-6 rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-red-200">
					✗ {form.error}
				</div>
			{/if}

			<!-- Search -->
			<div class="backdrop-blur-sm rounded-lg p-4 shadow-lg border" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
				<label class="block text-sm font-medium text-gray-300 mb-2">
					🔍 Search Users
				</label>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search by username..."
					class="w-full bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
				/>
			</div>
		</div>

		<!-- Users Table -->
		<div class="backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden" style="background-color: var(--theme-bg-secondary); border-color: var(--theme-border);">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b" style="background-color: var(--theme-bg-primary); border-color: var(--theme-border);">
						<tr>
							<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">ID</th>
							<th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Username</th>
							<th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y" style="border-color: var(--theme-border);">
						{#each filteredUsers as user (user.id)}
							<tr class="admin-table-row transition-colors">
								<td class="px-6 py-4">
									<div class="text-sm text-gray-400">#{user.id}</div>
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center gap-2">
										<span class="font-semibold text-white">{user.username}</span>
										{#if user.username.toLowerCase() === adminUsername}
											<span class="px-2 py-1 bg-blue-600 text-xs text-white rounded-full">Admin</span>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="flex gap-2 justify-end">
										<button
											on:click={() => openResetModal(user.username)}
											class="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
										>
											🔑 Reset Password
										</button>
										{#if user.username.toLowerCase() !== adminUsername}
											<button
												on:click={() => openDeleteModal(user.username)}
												class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
											>
												🗑️ Delete
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="px-6 py-12 text-center" style="color: var(--theme-text-secondary);">
									No users found.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Reset Password Modal -->
{#if showResetModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
		<div class="relative w-full max-w-md rounded-lg border p-6 shadow-2xl" style="background-color: var(--theme-bg-primary); border-color: var(--theme-border);">
			<button
				class="absolute top-2 right-2 text-2xl text-gray-400 hover:text-white"
				on:click={closeModals}>&times;</button
			>
			<h2 class="text-2xl font-bold text-white mb-4">Reset Password</h2>
			<p class="text-gray-400 mb-4">Reset password for <span class="text-blue-400 font-semibold">{selectedUser}</span></p>

			<form method="POST" action="?/resetPassword" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						closeModals();
					}
					await update();
				};
			}}>
				<input type="hidden" name="username" value={selectedUser} />
				
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">New Password</label>
						<div class="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								name="newPassword"
								bind:value={newPassword}
								placeholder="Enter new password"
								class="w-full bg-gray-800 text-white px-4 py-2 pr-20 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
								required
							/>
							<button
								type="button"
								on:click={() => showPassword = !showPassword}
								class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white px-2"
							>
								{showPassword ? '👁️' : '👁️‍🗨️'}
							</button>
						</div>
						{#if newPassword && !passwordValid}
							<p class="text-xs text-red-400 mt-1">
								Password must be 8+ chars with uppercase, lowercase, number, and special character
							</p>
						{/if}
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
						<input
							type={showPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Confirm new password"
							class="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
							required
						/>
						{#if confirmPassword && !passwordsMatch}
							<p class="text-xs text-red-400 mt-1">Passwords do not match</p>
						{/if}
					</div>

					<div class="flex gap-2">
						<button
							type="button"
							on:click={generateRandomPassword}
							class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
						>
							🎲 Generate
						</button>
						{#if newPassword}
							<button
								type="button"
								on:click={() => copyToClipboard(newPassword)}
								class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
								title="Copy password"
							>
								📋
							</button>
						{/if}
					</div>

					<div class="flex gap-3">
						<button
							type="button"
							on:click={closeModals}
							class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
							disabled={isSubmitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							class="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={!passwordValid || !passwordsMatch || isSubmitting}
						>
							{isSubmitting ? 'Resetting...' : 'Reset Password'}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete User Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
		<div class="relative w-full max-w-md rounded-lg border border-red-700 p-6 shadow-2xl" style="background-color: var(--theme-bg-primary);">
			<button
				class="absolute top-2 right-2 text-2xl text-gray-400 hover:text-white"
				on:click={closeModals}>&times;</button
			>
			<h2 class="text-2xl font-bold text-red-400 mb-4">⚠️ Delete User</h2>
			<p class="text-gray-300 mb-6">
				Are you sure you want to delete <span class="text-red-400 font-semibold">{selectedUser}</span>?
				<br><br>
				<span class="text-red-300 font-semibold">This action cannot be undone!</span>
			</p>

			<form method="POST" action="?/deleteUser" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						closeModals();
					}
					await update();
				};
			}}>
				<input type="hidden" name="username" value={selectedUser} />
				
				<div class="flex gap-3">
					<button
						type="button"
						on:click={closeModals}
						class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Deleting...' : 'Delete User'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

