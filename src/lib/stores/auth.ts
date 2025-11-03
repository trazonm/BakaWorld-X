import { writable } from 'svelte/store';

export const auth = writable<{ isLoggedIn: boolean; username: string }>({
  isLoggedIn: false,
  username: ''
});

export async function refreshAuth() {
  const res = await fetch('/api/auth/session', {
    credentials: 'include' // Include cookies in request
  });
  const data = await res.json();
  auth.set({
    isLoggedIn: data.isLoggedIn,
    username: data.user && typeof data.user === 'object' && 'username' in data.user ? data.user.username : ''
  });
}
