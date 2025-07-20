// DOM and browser utilities
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => inThrottle = false, limit);
		}
	};
}

export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		console.error('Failed to copy to clipboard:', err);
		return false;
	}
}

export function preventPageUnload(prevent: boolean): void {
	const handler = (event: BeforeUnloadEvent) => {
		event.preventDefault();
		event.returnValue = '';
	};
	
	if (prevent) {
		window.addEventListener('beforeunload', handler);
	} else {
		window.removeEventListener('beforeunload', handler);
	}
}

export function getElementPosition(element: HTMLElement) {
	const rect = element.getBoundingClientRect();
	return {
		top: rect.top + window.scrollY,
		left: rect.left + window.scrollX,
		width: rect.width,
		height: rect.height
	};
}

export function scrollToElement(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
	element.scrollIntoView({ behavior, block: 'center' });
}
