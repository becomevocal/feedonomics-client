import { FdxClient } from '../lib/FdxClient';
import { FdxService } from '../services/FdxService';
import { BigCommerceSetupParams } from '../types';

// Mock FdxClient
jest.mock('../lib/FdxClient');

describe('FdxService - BigCommerce Integration', () => {
  let mockClient: jest.Mocked<FdxClient>;
  let service: FdxService;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock client
    mockClient = new FdxClient({} as any) as jest.Mocked<FdxClient>;
    
    // Initialize service with mock client
    service = new FdxService(mockClient);
  });
  
  describe('setupBigCommerceIntegration', () => {
    const mockParams: BigCommerceSetupParams = {
      accountName: 'Test Store',
      storeHash: 'abc123',
      accessToken: 'test_token',
      channelId: '12345',
      userEmail: 'test@example.com',
      storeUrl: 'https://store-abc123.mybigcommerce.com/',
      dbName: 'BC Store abc123',
      groupName: 'BigCommerce',
      vaultEntryName: 'bc_credentials',
      importSchedule: {
        day: '*',
        hour: '*/4',
        minute: '0'
      },
      buildTemplate: 'bigcommerce_template'
    };
    
    it('should successfully set up a BigCommerce integration', async () => {
      // Setup successful mock responses
      mockClient.createBigCommerceAccount.mockResolvedValue({
        success: true,
        data: { id: '1234' }
      });
      
      mockClient.invitePrimaryUser.mockResolvedValue({
        success: true,
        data: { email: 'test@example.com' }
      });
      
      mockClient.createDb.mockResolvedValue({
        success: true,
        data: { 
          id: '5678',
          name: 'BC Store abc123',
          account_id: '1234'
        }
      });
      
      mockClient.setDbId = jest.fn();
      
      mockClient.moveDbintoNewDbGroup.mockResolvedValue({
        success: true,
        data: { id: '91011' }
      });
      
      mockClient.addDbVaultEntry.mockResolvedValue({
        success: true,
        data: { data: { new_row_id: '1213' } }
      });
      
      mockClient.generateBigCommercePreprocessorUrl.mockReturnValue('https://preprocessor.url');
      
      mockClient.createImport.mockResolvedValue({
        success: true,
        data: { id: '1415' }
      });
      
      mockClient.updateImportSchedule.mockResolvedValue({
        success: true,
        data: {}
      });
      
      mockClient.applyAutomateBuildTemplate.mockResolvedValue({
        success: true,
        data: {}
      });
      
      // Call the method
      const result = await service.setupBigCommerceIntegration(mockParams);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        accountId: '1234',
        dbId: '5678',
        importId: '1415',
        vaultEntryId: '1213',
        primaryUserEmail: 'test@example.com'
      });
      
      // Verify that all expected methods were called with correct parameters
      expect(mockClient.createBigCommerceAccount).toHaveBeenCalledWith('Test Store');
      expect(mockClient.invitePrimaryUser).toHaveBeenCalledWith('1234', 'test@example.com');
      expect(mockClient.createDb).toHaveBeenCalledWith('1234', 'BC Store abc123');
      expect(mockClient.setDbId).toHaveBeenCalledWith('5678');
      expect(mockClient.moveDbintoNewDbGroup).toHaveBeenCalledWith('5678', 'BigCommerce');
      expect(mockClient.addDbVaultEntry).toHaveBeenCalledWith('5678', expect.objectContaining({
        name: 'bc_credentials',
        credentials_type: 'none',
        credentials: expect.any(String)
      }));
      expect(mockClient.generateBigCommercePreprocessorUrl).toHaveBeenCalledWith(expect.objectContaining({
        connection_info: expect.objectContaining({
          access_token: 'test_token',
          store_hash: 'abc123',
          store_url: 'https://store-abc123.mybigcommerce.com/'
        })
      }));
      expect(mockClient.createImport).toHaveBeenCalledWith(expect.objectContaining({
        name: 'BC Product Import',
        file_location: 'preprocess_script'
      }));
      expect(mockClient.updateImportSchedule).toHaveBeenCalledWith('1415', {
        day: '*',
        hour: '*/4',
        minute: '0'
      });
      expect(mockClient.applyAutomateBuildTemplate).toHaveBeenCalledWith('1415', 'bigcommerce_template');
    });
    
    it('should handle errors at different stages of setup', async () => {
      // Test account creation failure
      mockClient.createBigCommerceAccount.mockResolvedValue({
        success: false,
        error: 'Account creation failed'
      });
      
      let result = await service.setupBigCommerceIntegration(mockParams);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create account');
      
      // Test user invitation failure
      mockClient.createBigCommerceAccount.mockResolvedValue({
        success: true,
        data: { id: '1234' }
      });
      
      mockClient.invitePrimaryUser.mockResolvedValue({
        success: false,
        error: 'User invitation failed'
      });
      
      result = await service.setupBigCommerceIntegration(mockParams);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to invite user');
      
      // Test database creation failure
      mockClient.invitePrimaryUser.mockResolvedValue({
        success: true,
        data: {}
      });
      
      mockClient.createDb.mockResolvedValue({
        success: false,
        error: 'Database creation failed'
      });
      
      result = await service.setupBigCommerceIntegration(mockParams);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create database');
    });
    
    it('should handle unexpected exceptions', async () => {
      // Setup mock to throw an exception
      mockClient.createBigCommerceAccount.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      const result = await service.setupBigCommerceIntegration(mockParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('BigCommerce setup failed: Unexpected error');
    });
  });
}); 