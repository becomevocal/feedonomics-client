import { FdxClient } from '../lib/FdxClient';
import { FdxService } from '../services/FdxService';
import { ServiceResponse } from '../types';

// Mock the FdxClient to avoid actual API calls during tests
jest.mock('../lib/FdxClient');
const MockedFdxClient = FdxClient as jest.MockedClass<typeof FdxClient>;

describe('FdxService', () => {
  let client: FdxClient;
  let service: FdxService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mocked client instance
    client = new MockedFdxClient({
      apiToken: 'test-token',
      importUrl: 'https://test.example.com/import',
      vaultEntryName: 'test-vault',
    });
    
    // Mock the generateBigCommercePreprocessorUrl method
    (client.generateBigCommercePreprocessorUrl as jest.Mock).mockImplementation(() => {
      return 'https://preprocess.proxy.feedonomics.com/preprocess/run_preprocess.php?connection_info%5Baccess_token%5D=%7B%7Bfeedonomics%3A%3Avault%3A%3Abc_credentials%3A%3Aaccess_token%7D%7D&connection_info%5Bclient_id%5D=12345&connection_info%5Bstore_hash%5D=abc123&connection_info%5Bstore_url%5D=https%3A%2F%2Fstore-abc123.mybigcommerce.com&connection_info%5Bchannel_ids%5D=1&connection_info%5Bfilters%5D%5Bis_visible%5D=1&connection_info%5Binclude%5D=products&connection_info%5Badditional_parent_fields%5D=price%2Csale_price&connection_info%5Badditional_variant_fields%5D=price%2Csale_price&connection_info%5Bpull_sample%5D=1&file_info%5Brequest_type%5D=get';
    });
    
    // Mock createBigCommerceAccount for testing
    (client.createBigCommerceAccount as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 123, name: 'Test BigCommerce Account' }
    });
    
    // Create the service with the mocked client
    service = new FdxService(client);
  });

  describe('Account Management', () => {
    it('should retrieve accounts and map them by name', async () => {
      const mockAccounts: ServiceResponse<any[]> = {
        success: true,
        data: [
          { id: 1, account_name: 'BC-12345' },
          { id: 2, account_name: 'BC-67890' }
        ]
      };
      
      (client.accounts as jest.Mock).mockResolvedValueOnce(mockAccounts);
      
      const result = await service.retrieveAccounts();
      
      expect(client.accounts).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        'BC-12345': { id: 1, account_name: 'BC-12345' },
        'BC-67890': { id: 2, account_name: 'BC-67890' }
      });
    });

    it('should handle error when retrieving accounts', async () => {
      const mockError: ServiceResponse<any[]> = {
        success: false,
        error: 'API error'
      };
      
      (client.accounts as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.retrieveAccounts();
      
      expect(client.accounts).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting accounts');
    });

    it('should get existing account when it exists', async () => {
      const mockAccounts: ServiceResponse<Record<string, any>> = {
        success: true,
        data: {
          'BC-12345': { id: 1, account_name: 'BC-12345' }
        }
      };
      
      // Mock retrieveAccounts to return the mock data
      jest.spyOn(service, 'retrieveAccounts').mockResolvedValueOnce(mockAccounts);
      
      const result = await service.getOrCreateAccount('12345');
      
      expect(service.retrieveAccounts).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, account_name: 'BC-12345' });
    });

    it('should create account when it does not exist', async () => {
      const mockAccounts: ServiceResponse<Record<string, any>> = {
        success: true,
        data: {} // No accounts
      };
      
      const mockCreateAccount: ServiceResponse<any> = {
        success: true,
        data: { id: 1, account_name: 'BC-12345' }
      };
      
      // Mock retrieveAccounts and createAccount
      jest.spyOn(service, 'retrieveAccounts').mockResolvedValueOnce(mockAccounts);
      jest.spyOn(service, 'createAccount').mockResolvedValueOnce(mockCreateAccount);
      
      const result = await service.getOrCreateAccount('12345');
      
      expect(service.retrieveAccounts).toHaveBeenCalled();
      expect(service.createAccount).toHaveBeenCalledWith('BC-12345');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, account_name: 'BC-12345' });
    });

    it('should handle error when retrieving accounts for getOrCreateAccount', async () => {
      const mockError: ServiceResponse<Record<string, any>> = {
        success: false,
        error: 'API error'
      };
      
      jest.spyOn(service, 'retrieveAccounts').mockResolvedValueOnce(mockError);
      
      const result = await service.getOrCreateAccount('12345');
      
      expect(service.retrieveAccounts).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });

    it('should handle error when creating account', async () => {
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      
      (client.createBigCommerceAccount as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.createAccount('BC-12345');
      
      expect(client.createBigCommerceAccount).toHaveBeenCalledWith('BC-12345');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating account');
    });
  });

  describe('Import Management', () => {
    it('should create or update import configuration', async () => {
      // Mock retrieveImport to return no existing import
      jest.spyOn(service, 'retrieveImport').mockResolvedValueOnce({
        success: true,
        data: null
      });
      
      // Mock client.createImport to return success
      const mockCreateImport: ServiceResponse<any> = {
        success: true,
        data: { id: 1, name: 'BigCommerceImport' }
      };
      (client.createImport as jest.Mock).mockResolvedValueOnce(mockCreateImport);
      
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      
      const result = await service.createOrUpdateImport(user, channelId, true);
      
      expect(service.retrieveImport).toHaveBeenCalled();
      expect(client.createImport).toHaveBeenCalledWith(expect.objectContaining({
        name: 'BigCommerceImport',
        additional_options: 'google_field,category_tree'
      }));
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'BigCommerceImport' });
    });

    it('should update existing import configuration', async () => {
      // Mock retrieveImport to return an existing import
      const existingImport = { id: 1, name: 'BigCommerceImport' };
      jest.spyOn(service, 'retrieveImport').mockResolvedValueOnce({
        success: true,
        data: existingImport
      });
      
      // Mock client.updateImport to return success
      const mockUpdateImport: ServiceResponse<any> = {
        success: true,
        data: { id: 1, name: 'BigCommerceImport', updated: true }
      };
      (client.updateImport as jest.Mock).mockResolvedValueOnce(mockUpdateImport);
      
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      
      const result = await service.createOrUpdateImport(user, channelId, false);
      
      expect(service.retrieveImport).toHaveBeenCalled();
      expect(client.updateImport).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'BigCommerceImport',
        additional_options: 'google_field,category_tree',
        do_import: false
      }));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(existingImport);
    });

    it('should handle error when retrieving imports', async () => {
      const mockError: ServiceResponse<any[]> = {
        success: false,
        error: 'API error'
      };
      
      (client.imports as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.retrieveImport();
      
      expect(client.imports).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting imports');
    });

    it('should handle error when creating import', async () => {
      jest.spyOn(service, 'retrieveImport').mockResolvedValueOnce({
        success: true,
        data: null
      });
      
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      (client.createImport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      
      const result = await service.createOrUpdateImport(user, channelId, true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating import');
    });

    it('should handle error when updating import', async () => {
      jest.spyOn(service, 'retrieveImport').mockResolvedValueOnce({
        success: true,
        data: { id: 1, name: 'BigCommerceImport' }
      });
      
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      (client.updateImport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      
      const result = await service.createOrUpdateImport(user, channelId, false);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error updating import');
    });

    it('should schedule an import', async () => {
      const mockSchedule = {
        success: true,
        data: { scheduled: true }
      };
      
      // Mock scheduleImport to return success
      (client.updateImportSchedule as jest.Mock).mockResolvedValueOnce(mockSchedule);
      
      const result = await service.updateImportSchedule(1, '*', '1', '30');
      
      expect(client.updateImportSchedule).toHaveBeenCalledWith(1, {
        day: '*',
        hour: '1',
        minute: '30'
      });
      
      expect(result).toEqual({
        success: true,
        data: mockSchedule.data
      });
    });

    it('should handle error when scheduling an import', async () => {
      const mockError = {
        success: false,
        error: 'Schedule error'
      };
      
      (client.updateImportSchedule as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.updateImportSchedule(1, '*', '1', '30');
      
      expect(result).toEqual({
        success: false,
        error: 'Error updating import schedule: Schedule error'
      });
    });
  });

  describe('Export Management', () => {
    it('should create export when none exists', async () => {
      // Mock getExistingExport to return no export
      jest.spyOn(service, 'getExistingExport').mockResolvedValueOnce({
        success: true,
        data: null
      });
      
      // Mock client.createExport to return success
      const mockCreateExport: ServiceResponse<any> = {
        success: true,
        data: { id: 1, name: 'Export Google' }
      };
      (client.createExport as jest.Mock).mockResolvedValueOnce(mockCreateExport);
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const result = await service.createOrUpdateExport(ftpCredentials, 'products.txt');
      
      expect(service.getExistingExport).toHaveBeenCalled();
      expect(client.createExport).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Export Google',
        file_name: 'products.txt',
        protocol: 'sftp'
      }));
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Export Google' });
    });

    it('should schedule export when timeSlot is provided', async () => {
      // Mock getExistingExport to return an export
      const existingExport = { id: 1, name: 'Export Google' };
      jest.spyOn(service, 'getExistingExport').mockResolvedValueOnce({
        success: true,
        data: existingExport
      });
      
      // Mock updateExport to return success
      (client.updateExport as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { updated: true }
      });
      
      // Mock scheduleExport to return success
      (client.scheduleExport as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { scheduled: true }
      });
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const timeSlot = { hour: '1', minutes: '30' };
      
      const result = await service.createOrUpdateExport(ftpCredentials, 'products.txt', timeSlot);
      
      expect(service.getExistingExport).toHaveBeenCalled();
      expect(client.updateExport).toHaveBeenCalledWith(1, expect.anything());
      expect(client.scheduleExport).toHaveBeenCalledWith(1, {
        day: '*',
        hour: '1',
        minute: '30'
      });
      expect(result.success).toBe(true);
    });

    it('should handle error when getting existing export', async () => {
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      
      jest.spyOn(service, 'getExistingExport').mockResolvedValueOnce(mockError);
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const result = await service.createOrUpdateExport(ftpCredentials, 'products.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Getting existing export');
    });

    it('should handle error when creating export', async () => {
      jest.spyOn(service, 'getExistingExport').mockResolvedValueOnce({
        success: true,
        data: null
      });
      
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      (client.createExport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const result = await service.createOrUpdateExport(ftpCredentials, 'products.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Creating or updating exports');
    });

    it('should handle error when scheduling export', async () => {
      jest.spyOn(service, 'getExistingExport').mockResolvedValueOnce({
        success: true,
        data: { id: 1, name: 'Export Google' }
      });
      
      (client.updateExport as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { updated: true }
      });
      
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      (client.scheduleExport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const timeSlot = { hour: '1', minutes: '30' };
      
      const result = await service.createOrUpdateExport(ftpCredentials, 'products.txt', timeSlot);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error setting running export schedule');
    });
  });

  describe('Transformer Management', () => {
    it('should create transformers', async () => {
      // Mock client.createTransformer to return success for each call
      (client.createTransformer as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 1, field_name: 'currency' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 2, field_name: 'weight_unit' }
        });
      
      const transformers = [
        { 
          enabled: true,
          field_name: 'currency', 
          selector: 'true',
          transformer: 'lowercase([currency])',
          export_id: []
        },
        { 
          enabled: true,
          field_name: 'weight_unit', 
          selector: 'true',
          transformer: 'uppercase([weight_unit])',
          export_id: []
        }
      ];
      
      const result = await service.createTransformers(transformers);
      
      expect(client.createTransformer).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { id: 1, field_name: 'currency' },
        { id: 2, field_name: 'weight_unit' }
      ]);
    });

    it('should handle error when creating transformers', async () => {
      // First call succeeds, second fails
      (client.createTransformer as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 1, field_name: 'currency' }
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'API error'
        });
      
      const transformers = [
        { 
          enabled: true,
          field_name: 'currency', 
          selector: 'true',
          transformer: 'lowercase([currency])',
          export_id: []
        },
        { 
          enabled: true,
          field_name: 'weight_unit', 
          selector: 'true',
          transformer: 'uppercase([weight_unit])',
          export_id: []
        }
      ];
      
      const result = await service.createTransformers(transformers);
      
      expect(client.createTransformer).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating transformer');
    });
  });

  describe('Database Management', () => {
    it('should create database', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { id: 1, name: 'test-db' }
      };
      
      (client.createDb as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.createDb(1, 'test-db');
      
      expect(client.createDb).toHaveBeenCalledWith(1, 'test-db');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'test-db' });
    });

    it('should handle error when creating database', async () => {
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      
      (client.createDb as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.createDb(1, 'test-db');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating db');
    });

    it('should delete database', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { deleted: true }
      };
      
      (client.deleteDb as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.deleteDb(1);
      
      expect(client.deleteDb).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ deleted: true });
    });

    it('should handle error when deleting database', async () => {
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      
      (client.deleteDb as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.deleteDb(1);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error deleting db');
    });
  });

  describe('FTP Management', () => {
    it('should get FTP credentials', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: [{ username: 'ftpuser', password: 'pass' }]
      };
      
      (client.ftpAccounts as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.getFtpCredentials();
      
      expect(client.ftpAccounts).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ username: 'ftpuser', password: 'pass' }]);
    });

    it('should create FTP credentials when none exist', async () => {
      // Mock empty FTP accounts response
      (client.ftpAccounts as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: []
      });
      
      // Mock create FTP accounts response
      const mockCreateResponse: ServiceResponse<any> = {
        success: true,
        data: { username: 'newftpuser', password: 'pass' }
      };
      (client.createFtpAccounts as jest.Mock).mockResolvedValueOnce(mockCreateResponse);
      
      const result = await service.getFtpCredentials();
      
      expect(client.ftpAccounts).toHaveBeenCalled();
      expect(client.createFtpAccounts).toHaveBeenCalledWith({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ username: 'newftpuser', password: 'pass' });
    });

    it('should handle error when getting FTP credentials', async () => {
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      
      (client.ftpAccounts as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.getFtpCredentials();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting credentials');
    });

    it('should handle error when creating FTP credentials', async () => {
      // Mock empty FTP accounts response
      (client.ftpAccounts as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: []
      });
      
      // Mock create FTP error
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      (client.createFtpAccounts as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.getFtpCredentials();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating FTP credentials');
    });
  });

  describe('Join Import Management', () => {
    it('should create join import', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { id: 1, name: 'Extra Google Fields' }
      };
      
      (client.createJoinImport as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const result = await service.createJoinImport(ftpCredentials, 'extra.txt');
      
      expect(client.createJoinImport).toHaveBeenCalledWith({
        name: 'Extra Google Fields',
        file_name: 'extra.txt',
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Extra Google Fields' });
    });

    it('should handle error when creating join import', async () => {
      const mockError: ServiceResponse<any> = {
        success: false,
        error: 'API error'
      };
      
      (client.createJoinImport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const result = await service.createJoinImport(ftpCredentials, 'extra.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating join import');
    });
  });

  describe('Group Management', () => {
    it('should move database to group when group exists', async () => {
      const mockGroupsResponse = {
        success: true,
        data: [{ id: 1, name: 'BC-12345' }]
      };
      
      const mockMoveResponse = {
        success: true,
        data: { moved: true }
      };
      
      (client.groups as jest.Mock).mockResolvedValueOnce(mockGroupsResponse);
      (client.moveDbToGroup as jest.Mock).mockResolvedValueOnce(mockMoveResponse);
      
      const result = await service.moveDbToGroup(1, 'BC-12345');
      
      expect(client.groups).toHaveBeenCalledWith(1);
      expect(client.moveDbToGroup).toHaveBeenCalledWith({
        db_id: 0,
        group_id: 1,
        group_name: 'BC-12345'
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ moved: true });
    });

    it('should create group when group does not exist', async () => {
      const mockGroupsResponse = {
        success: true,
        data: [] // No existing groups
      };
      
      const mockCreateResponse = {
        success: true,
        data: { id: 1, name: 'BC-12345' }
      };
      
      (client.groups as jest.Mock).mockResolvedValueOnce(mockGroupsResponse);
      (client.createGroup as jest.Mock).mockResolvedValueOnce(mockCreateResponse);
      
      const result = await service.moveDbToGroup(1, 'BC-12345');
      
      expect(client.groups).toHaveBeenCalledWith(1);
      expect(client.createGroup).toHaveBeenCalledWith('BC-12345');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'BC-12345' });
    });

    it('should handle error when getting groups', async () => {
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.groups as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.moveDbToGroup(1, 'BC-12345');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting db groups');
    });

    it('should handle error when moving to group', async () => {
      const mockGroupsResponse = {
        success: true,
        data: [{ id: 1, name: 'BC-12345' }]
      };
      
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.groups as jest.Mock).mockResolvedValueOnce(mockGroupsResponse);
      (client.moveDbToGroup as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.moveDbToGroup(1, 'BC-12345');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error moving db to group');
    });

    it('should handle error when creating group', async () => {
      const mockGroupsResponse = {
        success: true,
        data: [] // No existing groups
      };
      
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.groups as jest.Mock).mockResolvedValueOnce(mockGroupsResponse);
      (client.createGroup as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.moveDbToGroup(1, 'BC-12345');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error moving db to group');
    });
  });

  describe('Export Configuration', () => {
    it('should handle existing export update', async () => {
      const existingExport = { id: 1, name: 'Export Google' };
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const mockUpdateResponse = {
        success: true,
        data: { updated: true }
      };
      
      (client.updateExport as jest.Mock).mockResolvedValueOnce(mockUpdateResponse);
      
      const result = await (service as any).handleExistingExport(existingExport, ftpCredentials, 'products.txt');
      
      expect(client.updateExport).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Export Google',
        file_name: 'products.txt',
        protocol: 'sftp'
      }));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(existingExport);
    });

    it('should handle error when updating existing export', async () => {
      const existingExport = { id: 1, name: 'Export Google' };
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.updateExport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await (service as any).handleExistingExport(existingExport, ftpCredentials, 'products.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error updating exports');
    });

    it('should create new export when none exists', async () => {
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const mockCreateResponse = {
        success: true,
        data: { id: 1, name: 'Export Google' }
      };
      
      (client.createExport as jest.Mock).mockResolvedValueOnce(mockCreateResponse);
      
      const result = await (service as any).handleExistingExport(null, ftpCredentials, 'products.txt');
      
      expect(client.createExport).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Export Google',
        file_name: 'products.txt',
        protocol: 'sftp'
      }));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreateResponse.data);
    });

    it('should handle error when creating new export', async () => {
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.createExport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await (service as any).handleExistingExport(null, ftpCredentials, 'products.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating exports');
    });

    it('should schedule export with time slot', async () => {
      const export_ = { id: 1, name: 'Export Google' };
      const timeSlot = { hour: '1', minutes: '30' };
      
      const mockScheduleResponse = {
        success: true,
        data: { scheduled: true }
      };
      
      (client.scheduleExport as jest.Mock).mockResolvedValueOnce(mockScheduleResponse);
      
      const result = await (service as any).runExportSchedule(export_, timeSlot);
      
      expect(client.scheduleExport).toHaveBeenCalledWith(1, {
        day: '*',
        hour: '1',
        minute: '30'
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(export_);
    });

    it('should handle error when scheduling export', async () => {
      const export_ = { id: 1, name: 'Export Google' };
      const timeSlot = { hour: '1', minutes: '30' };
      
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.scheduleExport as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await (service as any).runExportSchedule(export_, timeSlot);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error setting running export schedule');
    });

    it('should build export config with all fields', () => {
      const ftpCredentials = {
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass'
      };
      
      const config = (service as any).buildExportConfig(ftpCredentials, 'products.txt');
      
      expect(config).toEqual({
        name: 'Export Google',
        file_name: 'products.txt',
        protocol: 'sftp',
        host: 'ftp.example.com',
        username: 'user',
        password: 'pass',
        export_fields: expect.any(Array),
        export_selector: "[can_export] equal 'true'",
        tags: [
          {
            tag: 'export_template',
            value: 'google_shopping'
          }
        ]
      });
    });

    it('should get all required export fields', () => {
      const fields = (service as any).getExportFields();
      
      // Test all required field mappings
      const expectedMappings = {
        id: 'id',
        title: 'title',
        description: 'description',
        product_type: 'category_ancestors',
        link: 'product_url',
        image_link: 'image_link',
        additional_image_link: 'additional_image_link_zoom',
        condition: 'condition',
        availability: 'availability',
        price: 'price_parent',
        sale_price: 'sale_price_parent',
        brand: 'brand',
        gtin: 'gtin',
        mpn: 'mpn',
        item_group_id: 'item_group_id',
        currency: 'currency',
        storefront_url: 'storefront_url',
        country: 'country',
        language: 'language',
        product_url: 'product_url',
        weight_unit: 'weight_unit'
      };
      
      Object.entries(expectedMappings).forEach(([exportFieldName, fieldName]) => {
        expect(fields).toContainEqual({
          field_name: fieldName,
          export_field_name: exportFieldName,
          required: ''
        });
      });
      
      // Verify total number of fields
      expect(fields).toHaveLength(Object.keys(expectedMappings).length);
    });
  });

  describe('Import Configuration', () => {
    it('should build import config for create mode', () => {
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      
      const config = (service as any).buildImportConfig(user, channelId, true);
      
      expect(config).toEqual({
        name: 'BigCommerceImport',
        additional_options: 'google_field,category_tree',
        url: expect.any(String),
        preprocess_info: {
          connection_info: expect.any(Object)
        }
      });
      expect(config.do_import).toBeUndefined();
    });

    it('should build import config for update mode', () => {
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      
      const config = (service as any).buildImportConfig(user, channelId, false);
      
      expect(config).toEqual({
        name: 'BigCommerceImport',
        additional_options: 'google_field,category_tree',
        url: expect.any(String),
        preprocess_info: {
          connection_info: expect.any(Object)
        },
        do_import: false
      });
    });

    it('should build connection info for import config', async () => {
      const user = { id: 12345, storeHash: 'abc123' };
      const channelIds = [1];
      const mode = 'create';
      
      const connectionInfo = (service as any).buildConnectionInfo(user, channelIds, mode);
      
      expect(connectionInfo).toEqual({
        access_token: '{{feedonomics::vault::bc_credentials::access_token}}',
        client_id: 12345,
        store_hash: 'abc123',
        store_url: 'https://store-abc123.mybigcommerce.com',
        channel_ids: [1],
        filters: {
          is_visible: 1
        },
        include: 'products',
        additional_parent_fields: 'price,sale_price',
        additional_variant_fields: 'price,sale_price',
        pull_sample: 1
      });
    });

    it('should build import url', async () => {
      const user = { id: 12345, storeHash: 'abc123' };
      const channelId = 1;
      const mode = 'create';
      
      const url = (service as any).buildImportUrl(user, channelId, mode);
      
      expect(url).toBe('https://preprocess.proxy.feedonomics.com/preprocess/run_preprocess.php?connection_info%5Baccess_token%5D=%7B%7Bfeedonomics%3A%3Avault%3A%3Abc_credentials%3A%3Aaccess_token%7D%7D&connection_info%5Bclient_id%5D=12345&connection_info%5Bstore_hash%5D=abc123&connection_info%5Bstore_url%5D=https%3A%2F%2Fstore-abc123.mybigcommerce.com&connection_info%5Bchannel_ids%5D=1&connection_info%5Bfilters%5D%5Bis_visible%5D=1&connection_info%5Binclude%5D=products&connection_info%5Badditional_parent_fields%5D=price%2Csale_price&connection_info%5Badditional_variant_fields%5D=price%2Csale_price&connection_info%5Bpull_sample%5D=1&file_info%5Brequest_type%5D=get');
    });
  });

  describe('Utility Methods', () => {
    it('should get account name with prefix', () => {
      const accountName = (service as any).getAccountName('12345');
      expect(accountName).toBe('BC-12345');
    });
  });

  describe('Run Import/Export', () => {
    it('should run import successfully', async () => {
      const mockResponse = {
        success: true,
        data: { running: true }
      };
      
      client.getDbId = jest.fn().mockReturnValue('test-db-123');
      (client.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.runImport('1');
      
      expect(client.request).toHaveBeenCalledWith('POST', '/dbs/test-db-123/imports/1/run', {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ running: true });
    });

    it('should handle missing dbId when running import', async () => {
      client.getDbId = jest.fn().mockReturnValue(undefined);
      
      const result = await service.runImport('1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No database selected');
    });

    it('should handle error when running import', async () => {
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      client.getDbId = jest.fn().mockReturnValue('test-db-123');
      (client.request as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.runImport('1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error running import');
    });

    it('should run export successfully', async () => {
      const mockResponse = {
        success: true,
        data: { running: true }
      };
      
      client.getDbId = jest.fn().mockReturnValue('test-db-123');
      (client.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.runExport('1');
      
      expect(client.request).toHaveBeenCalledWith('POST', '/dbs/test-db-123/exports/1/run', {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ running: true });
    });

    it('should handle missing dbId when running export', async () => {
      client.getDbId = jest.fn().mockReturnValue(undefined);
      
      const result = await service.runExport('1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No database selected');
    });

    it('should handle error when running export', async () => {
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      client.getDbId = jest.fn().mockReturnValue('test-db-123');
      (client.request as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.runExport('1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error running export');
    });
  });

  describe('Export Fields', () => {
    it('should get export fields with correct mapping', () => {
      const fields = (service as any).getExportFields();
      
      expect(fields).toContainEqual({
        field_name: 'id',
        export_field_name: 'id',
        required: ''
      });
      expect(fields).toContainEqual({
        field_name: 'title',
        export_field_name: 'title',
        required: ''
      });
      expect(fields).toContainEqual({
        field_name: 'category_ancestors',
        export_field_name: 'product_type',
        required: ''
      });
      // Add more field checks as needed
    });
  });

  describe('Vault Management', () => {
    it('should handle error when getting vault entries', async () => {
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.vault as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.updateVaultEntries('test-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting vaults');
    });

    it('should handle error when deleting old vault entry', async () => {
      const mockVaultResponse = {
        success: true,
        data: {
          data: {
            vault_rows: [
              { id: 1, name: 'BigCommerce Credentials', data: { access_token: 'old-token' } }
            ]
          }
        }
      };
      
      const mockDeleteError = {
        success: false,
        error: 'Delete error'
      };
      
      const mockCreateResponse = {
        success: true,
        data: { id: 2, name: 'bc_credentials', data: { access_token: 'test-token' } }
      };
      
      (client.vault as jest.Mock).mockResolvedValueOnce(mockVaultResponse);
      (client.deleteVault as jest.Mock).mockResolvedValueOnce(mockDeleteError);
      (client.createVault as jest.Mock).mockResolvedValueOnce(mockCreateResponse);
      
      const result = await service.updateVaultEntries('test-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error deleting vault');
    });

    it('should handle error when creating new vault entry', async () => {
      const mockVaultResponse = {
        success: true,
        data: {
          data: {
            vault_rows: []
          }
        }
      };
      
      const mockCreateError = {
        success: false,
        error: 'Create error'
      };
      
      (client.vault as jest.Mock).mockResolvedValueOnce(mockVaultResponse);
      (client.createVault as jest.Mock).mockResolvedValueOnce(mockCreateError);
      
      const result = await service.updateVaultEntries('test-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating vault');
    });

    it('should return null when no matching import is found', async () => {
      const mockResponse = {
        success: true,
        data: [{ name: 'OtherImport' }]
      };
      
      (client.imports as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.retrieveImport();
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('Export Management', () => {
    it('should handle error when getting existing export', async () => {
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.exports as jest.Mock).mockResolvedValueOnce(mockError);
      
      const result = await service.getExistingExport();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error getting exports');
    });

    it('should return null when no matching export is found', async () => {
      const mockResponse = {
        success: true,
        data: [{ name: 'OtherExport' }]
      };
      
      (client.exports as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await service.getExistingExport();
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('Database Field Management', () => {
    it('should handle error when updating database fields', async () => {
      const mockError = {
        success: false,
        error: 'API error'
      };
      
      (client.updateDbFields as jest.Mock).mockResolvedValueOnce(mockError);
      
      const fields = [
        { field_name: 'test', field_type: 'TEXT' }
      ];
      
      const result = await service.updateDbFields(fields);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error updating db fields');
    });

    it('should handle successful database field update', async () => {
      const mockResponse = {
        success: true,
        data: { updated: true }
      };
      
      (client.updateDbFields as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const fields = [
        { field_name: 'test', field_type: 'TEXT' }
      ];
      
      const result = await service.updateDbFields(fields);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ updated: true }]);
    });
  });

  describe('Vault Entry Management', () => {
    it('should handle missing vault rows', async () => {
      const mockVaultResponse = {
        success: true,
        data: {
          data: {}
        }
      };
      
      const mockCreateResponse = {
        success: true,
        data: { id: 1, name: 'bc_credentials', data: { access_token: 'test-token' } }
      };
      
      (client.vault as jest.Mock).mockResolvedValueOnce(mockVaultResponse);
      (client.createVault as jest.Mock).mockResolvedValueOnce(mockCreateResponse);
      
      const result = await service.updateVaultEntries('test-token');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreateResponse.data);
    });

    it('should handle successful vault entry update', async () => {
      const mockVaultResponse = {
        success: true,
        data: {
          data: {
            vault_rows: [
              { id: 1, name: 'bc_credentials', data: { access_token: 'old-token' } }
            ]
          }
        }
      };
      
      const mockUpdateResponse = {
        success: true,
        data: { id: 1, name: 'bc_credentials', data: { access_token: 'test-token' } }
      };
      
      (client.vault as jest.Mock).mockResolvedValueOnce(mockVaultResponse);
      (client.updateVault as jest.Mock).mockResolvedValueOnce(mockUpdateResponse);
      
      const result = await service.updateVaultEntries('test-token');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdateResponse.data);
    });

    it('should handle no existing vault entry to delete', async () => {
      const mockVaultResponse = {
        success: true,
        data: {
          data: {
            vault_rows: []
          }
        }
      };
      
      const mockCreateResponse = {
        success: true,
        data: { id: 1, name: 'bc_credentials', data: { access_token: 'test-token' } }
      };
      
      (client.vault as jest.Mock).mockResolvedValueOnce(mockVaultResponse);
      (client.createVault as jest.Mock).mockResolvedValueOnce(mockCreateResponse);
      
      const result = await service.updateVaultEntries('test-token');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreateResponse.data);
    });
  });
}); 