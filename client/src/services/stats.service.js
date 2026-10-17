import api, { data } from './api.js';

export const getPublicStats = () => data(api.get('/stats/public'));

// Shared settings so the hero and the numbers row use one request
export const publicStatsQuery = {
  queryKey: ['public-stats'],
  queryFn: getPublicStats,
  refetchInterval: 30000,
  staleTime: 15000,
};