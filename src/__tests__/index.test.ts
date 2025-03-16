import { createClient, createService, createFeedonomicsApi, FdxClient, FdxService } from '../index';

// Mock the FdxClient and FdxService classes
jest.mock('../lib/FdxClient');
jest.mock('../services/FdxService');

describe('Module exports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create a client with default config when no config is provided', () => {
      const client = createClient();
      
      expect(client).toBeInstanceOf(FdxClient);
      expect(FdxClient).toHaveBeenCalledWith(expect.objectContaining({
        apiToken: expect.any(String),
        importUrl: expect.any(String),
        vaultEntryName: expect.any(String)
      }));
    });

    it('should create a client with merged config when partial config is provided', () => {
      const config = {
        apiToken: 'custom-token',
        dbId: 'custom-db'
      };
      
      const client = createClient(config);
      
      expect(client).toBeInstanceOf(FdxClient);
      expect(FdxClient).toHaveBeenCalledWith(expect.objectContaining({
        apiToken: 'custom-token',
        dbId: 'custom-db',
        importUrl: expect.any(String),
        vaultEntryName: expect.any(String)
      }));
    });
  });

  describe('createService', () => {
    it('should create a service with the provided client', () => {
      const mockClient = new FdxClient({ 
        apiToken: 'test', 
        importUrl: 'test', 
        vaultEntryName: 'test' 
      });
      
      const service = createService(mockClient);
      
      expect(service).toBeInstanceOf(FdxService);
      expect(FdxService).toHaveBeenCalledWith(mockClient);
    });
  });

  describe('createFeedonomicsApi', () => {
    it('should create and return both client and service', () => {
      const mockClient = {} as FdxClient;
      const mockService = {} as FdxService;
      
      // Mock the factory functions
      (FdxClient as jest.MockedClass<typeof FdxClient>).mockImplementationOnce(() => mockClient);
      (FdxService as jest.MockedClass<typeof FdxService>).mockImplementationOnce(() => mockService);
      
      const result = createFeedonomicsApi({ apiToken: 'custom-token' });
      
      expect(result).toEqual({
        client: mockClient,
        service: mockService
      });
      expect(FdxClient).toHaveBeenCalledWith(expect.objectContaining({
        apiToken: 'custom-token'
      }));
      expect(FdxService).toHaveBeenCalledWith(mockClient);
    });
  });
}); 