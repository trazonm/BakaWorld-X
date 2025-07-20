// Custom error classes and error handling utilities
export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode: number = 500,
		public details?: any
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: any) {
		super(message, 'VALIDATION_ERROR', 400, details);
		this.name = 'ValidationError';
	}
}

export class AuthenticationError extends AppError {
	constructor(message: string = 'Authentication required') {
		super(message, 'AUTH_ERROR', 401);
		this.name = 'AuthenticationError';
	}
}

export class TorrentError extends AppError {
	constructor(message: string, details?: any) {
		super(message, 'TORRENT_ERROR', 500, details);
		this.name = 'TorrentError';
	}
}

export class NetworkError extends AppError {
	constructor(message: string, details?: any) {
		super(message, 'NETWORK_ERROR', 503, details);
		this.name = 'NetworkError';
	}
}

export function handleApiError(error: unknown): AppError {
	if (error instanceof AppError) {
		return error;
	}
	
	if (error instanceof Error) {
		return new AppError(error.message, 'UNKNOWN_ERROR');
	}
	
	return new AppError('An unknown error occurred', 'UNKNOWN_ERROR');
}

export function isNetworkError(error: unknown): boolean {
	return error instanceof NetworkError || 
		   (error instanceof Error && error.message.includes('fetch'));
}

export function getErrorMessage(error: unknown): string {
	if (error instanceof AppError) {
		return error.message;
	}
	
	if (error instanceof Error) {
		return error.message;
	}
	
	return 'An unknown error occurred';
}
