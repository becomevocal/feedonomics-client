// Export client, services, and types
import { FdxClient } from './lib/FdxClient';
import { FdxService } from './services/FdxService';
import * as Types from './types';

// Create a default configuration
const DEFAULT_CONFIG: Types.FeedonomicsConfig = {
  apiToken: process.env.FEEDONOMICS_API_TOKEN || '',
  importUrl: 'https://preprocess.proxy.feedonomics.com/preprocess/run_preprocess.php',
  vaultEntryName: 'bc_credentials',
  timeout: 60000
};

/**
 * Create a FdxClient instance with the provided configuration
 * @param config - Configuration object, can be partial
 * @returns Configured FdxClient
 */
export function createClient(config: Partial<Types.FeedonomicsConfig> = {}): FdxClient {
  const finalConfig: Types.FeedonomicsConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  return new FdxClient(finalConfig);
}

/**
 * Create a FdxService instance with the provided client
 * @param client - FdxClient instance
 * @returns FdxService instance
 */
export function createService(client: FdxClient): FdxService {
  return new FdxService(client);
}

/**
 * Create both client and service instances with the provided configuration
 * @param config - Configuration object, can be partial
 * @returns Object containing both client and service
 */
export function createFeedonomicsApi(config: Partial<Types.FeedonomicsConfig> = {}): {
  client: FdxClient;
  service: FdxService;
} {
  const client = createClient(config);
  const service = createService(client);
  
  return { client, service };
}

// Export all types and classes
export { FdxClient, FdxService, Types };

// Export a default object
export default {
  createClient,
  createService,
  createFeedonomicsApi,
  FdxClient,
  FdxService
}; 