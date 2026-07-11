import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { captureRuntimeError } from '@/monitoring/sentryErrors';

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			captureRuntimeError(error, {
				subsystem: 'SUPABASE',
				category: 'query_failure',
				metadata: { queryKey: query.queryKey },
			});
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			captureRuntimeError(error, {
				subsystem: 'SUPABASE',
				category: 'mutation_failure',
				metadata: { mutationKey: mutation.options.mutationKey },
			});
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
