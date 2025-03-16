import axios from 'axios';
import { FdxClient } from '../lib/FdxClient';
import { FeedonomicsConfig, VaultEntry } from '../types';

// Mock axios to avoid actual API calls during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FdxClient', () => {
  const mockConfig: FeedonomicsConfig = {
    apiToken: 'test-token',
    importUrl: 'https://test.example.com/import',
    vaultEntryName: 'test-vault',
    dbId: 'test-db-123',
  };

  let client: FdxClient;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup axios create mock to return an object with request method
    mockedAxios.create.mockReturnValue({
      request: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    } as any);
    
    client = new FdxClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create an instance with the provided config', () => {
      expect(client).toBeInstanceOf(FdxClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://meta.feedonomics.com/api.php',
        headers: expect.objectContaining({
          'x-api-key': 'test-token'
        })
      }));
    });

    it('should use default values when optional config is not provided', () => {
      const minimalConfig = {
        apiToken: 'test-token',
        importUrl: 'https://test.example.com/import',
        vaultEntryName: 'test-vault',
      };
      
      const clientWithMinimalConfig = new FdxClient(minimalConfig);
      expect(clientWithMinimalConfig).toBeInstanceOf(FdxClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        timeout: 60000,
        baseURL: 'https://meta.feedonomics.com/api.php'
      }));
    });

    it('should throw error if config is missing', () => {
      expect(() => new FdxClient(undefined as any)).toThrow('Config is required');
    });

    it('should throw error if API key is missing', () => {
      expect(() => new FdxClient({} as any)).toThrow('API key is required');
    });
  });

  describe('account methods', () => {
    it('should get all accounts', async () => {
      const mockResponse = { 
        status: 200, 
        data: [{ id: 1, account_name: 'Test Account' }] 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.accounts();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/user/accounts'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should invite a primary user', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.invitePrimaryUser(1, 'test@example.com');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/accounts/1/user_account_permissions',
        data: {
          permissions: 'primary',
          username: 'test@example.com'
        }
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should handle error when getting accounts', async () => {
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(new Error('Accounts not found'));

      const result = await client.accounts();
      expect(result).toEqual({
        success: false,
        error: 'Accounts not found'
      });
    });
  });

  describe('database methods', () => {
    it('should get all databases for an account', async () => {
      const mockResponse = { 
        status: 200, 
        data: [{ id: 1, name: 'Test DB', account_id: 1 }] 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.dbs(1);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/accounts/1/dbs'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create a database', async () => {
      const mockResponse = { 
        status: 201, 
        data: { id: 1, name: 'New DB', account_id: 1 } 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.createDb(1, 'New DB');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/accounts/1/dbs',
        data: { name: 'New DB' }
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });
  });

  describe('import methods', () => {
    it('should get all imports', async () => {
      const mockResponse = { 
        status: 200, 
        data: [{ id: 1, name: 'BigCommerceImport' }] 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.imports();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/dbs/test-db-123/imports'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create an import', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'New Import' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const importConfig = {
        name: 'New Import',
        url: 'https://example.com/feed',
        additional_options: 'option1,option2'
      };
      
      const result = await client.createImport(importConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/test-db-123/imports',
        data: importConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });

    it('should update an import', async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, name: 'Updated Import' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const importConfig = {
        name: 'Updated Import',
        url: 'https://example.com/feed',
        additional_options: 'option1,option2'
      };
      
      const result = await client.updateImport(1, importConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        url: '/dbs/test-db-123/imports/1',
        data: importConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should schedule an import', async () => {
      const mockResponse = {
        status: 200,
        data: { scheduled: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const schedule = {
        day: '*',
        hour: '1',
        minute: '30'
      };
      
      const result = await client.updateImportSchedule(1, schedule);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        url: '/dbs/test-db-123/imports/1/schedule',
        data: schedule
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });

  describe('export methods', () => {
    it('should get all exports', async () => {
      const mockResponse = {
        status: 200,
        data: [{ id: 1, name: 'Export Google' }]
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.exports();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/dbs/test-db-123/exports'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create an export', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'New Export' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const exportConfig = {
        name: 'New Export',
        file_name: 'products.txt',
        protocol: 'sftp',
        host: 'ftp.example.com',
        username: 'ftpuser',
        password: 'ftppass',
        export_fields: [
          { field_name: 'id', export_field_name: 'id', required: 'true' }
        ],
        export_selector: "[can_export] equal 'true'",
        tags: [
          { tag: 'export_template', value: 'google_shopping' }
        ]
      };
      
      const result = await client.createExport(exportConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/test-db-123/exports',
        data: exportConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });

    it('should update an export', async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, name: 'Updated Export' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const exportConfig = {
        name: 'Updated Export',
        file_name: 'products.txt',
        protocol: 'sftp',
        host: 'ftp.example.com',
        username: 'ftpuser',
        password: 'ftppass',
        export_fields: [
          { field_name: 'id', export_field_name: 'id', required: 'true' }
        ],
        export_selector: "[can_export] equal 'true'",
        tags: [
          { tag: 'export_template', value: 'google_shopping' }
        ]
      };
      
      const result = await client.updateExport(1, exportConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        url: '/dbs/test-db-123/exports/1',
        data: exportConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should schedule an export', async () => {
      const mockResponse = {
        status: 200,
        data: { scheduled: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const schedule = {
        day: '*',
        hour: '1',
        minute: '30'
      };
      
      const result = await client.scheduleExport(1, schedule);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/test-db-123/exports/1/schedule',
        data: schedule
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should handle missing dbId for export methods', async () => {
      client.setDbId(undefined as any);
      
      const methods = [
        () => client.exports(),
        () => client.createExport({} as any),
        () => client.updateExport(1, {} as any),
        () => client.updateImportSchedule(1, {} as any)
      ];
      
      for (const method of methods) {
        const result = await method();
        expect(result).toEqual({
          success: false,
          error: 'Database ID is required. Please set it using setDbId() first.'
        });
      }
    });

    it('should handle successful export operations', async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, name: 'Test Export' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const exportConfig = {
        name: 'Test Export',
        file_name: 'export.csv',
        protocol: 'sftp',
        host: 'example.com',
        username: 'user',
        password: 'pass',
        export_fields: [
          { field_name: 'id', export_field_name: 'id', required: 'true' }
        ],
        export_selector: "[status] = 'active'",
        tags: [
          { tag: 'type', value: 'product' }
        ]
      };
      
      const result = await client.createExport(exportConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: `/dbs/${client.getDbId()}/exports`,
        data: exportConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });

  describe('error handling', () => {
    it('should handle API error responses', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(errorResponse);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'Not found',
        status: 404
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(networkError);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle missing dbId for methods requiring it', async () => {
      client.setDbId(null as any); // Cast to any to bypass TypeScript check since we want to test this case
      
      const result = await client.applyAutomateBuildTemplate(1, 'template');
      
      expect(result).toEqual({
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      });
    });

    it('should handle error response without data', async () => {
      const errorResponse = {
        response: {
          status: 500
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(errorResponse);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'API error',
        status: 500
      });
    });

    it('should handle error response without status', async () => {
      const errorResponse = {
        response: {
          data: { message: 'Error message' }
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(errorResponse);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'Error message'
      });
    });

    it('should handle error without response object', async () => {
      const error = new Error('Network error') as any;
      delete error.response;
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(error);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle missing dbId for various operations', async () => {
      client.setDbId(undefined as any);
      
      // Test all methods that require dbId
      const methods = [
        () => client.applyAutomateBuildTemplate(1, 'template'),
        () => client.feedBuild(1),
        () => client.cancelBuild(1),
        () => client.ftpAccounts(),
        () => client.createFtpAccounts({}),
        () => client.imports(),
        () => client.createImport({} as any),
        () => client.updateImport(1, {} as any),
        () => client.updateImportSchedule(1, {} as any),
        () => client.exports(),
        () => client.createExport({} as any),
        () => client.updateExport(1, {} as any),
        () => client.scheduleExport(1, {} as any),
        () => client.transformers(),
        () => client.createTransformer({} as any),
        () => client.updateTransformer(1, {} as any),
        () => client.updateDbFields({}),
        () => client.createJoinImport({} as any),
        () => client.joinImports()
      ];
      
      for (const method of methods) {
        const result = await method();
        expect(result).toEqual({
          success: false,
          error: 'Database ID is required. Please set it using setDbId() first.'
        });
      }
    });
  });

  describe('utility methods', () => {
    it('should allow setting the database ID', () => {
      client.setDbId('new-db-456');
      
      // We need to call an API method to verify the new dbId is used
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce({ status: 200, data: [] });
      
      client.imports();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        url: '/dbs/new-db-456/imports'
      }));
    });

    it('should get connection details', () => {
      const details = client.getConnectionDetails();
      
      expect(details).toEqual({
        baseUrl: 'https://meta.feedonomics.com/api.php',
        apiKeySet: '[Set]',
        verbose: false
      });
    });

    it('should get database ID', () => {
      expect(client.getDbId()).toBe('test-db-123');
      
      client.setDbId('new-db-456');
      expect(client.getDbId()).toBe('new-db-456');
    });

    it('should handle verbose logging', () => {
      const client = new FdxClient({
        ...mockConfig,
        verbose: true
      });
      
      const consoleSpy = jest.spyOn(console, 'log');
      client.accounts();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Full API URL:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Set]'));
      consoleSpy.mockRestore();
    });

    it('should handle missing dbId for methods requiring it', async () => {
      client.setDbId(undefined as any);
      
      const methods = [
        () => client.imports(),
        () => client.exports(),
        () => client.transformers(),
        () => client.updateDbFields({}),
        () => client.joinImports(),
        () => client.createJoinImport({} as any)
      ];
      
      for (const method of methods) {
        const result = await method();
        expect(result).toEqual({
          success: false,
          error: 'Database ID is required. Please set it using setDbId() first.'
        });
      }
    });

    it('should set and get database ID', () => {
      client.setDbId('new-db-456');
      expect(client.getDbId()).toBe('new-db-456');
      
      client.setDbId(undefined as any);
      expect(client.getDbId()).toBeUndefined();
    });
  });

  describe('generateBigCommercePreprocessorUrl', () => {
    it('should generate URL with minimal required parameters', () => {
      const params = {
        connection_info: {
          access_token: 'test-token',
          client_id: '12345',
          store_hash: 'abc123',
          store_url: 'https://store-abc123.mybigcommerce.com'
        }
      };

      const url = client.generateBigCommercePreprocessorUrl(params);
      const parsedUrl = new URL(url);
      const searchParams = new URLSearchParams(parsedUrl.search);

      // Compare decoded values to ensure they match the original input
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[access_token]') || ''))).toBe('test-token');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[client_id]') || ''))).toBe('12345');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[store_hash]') || ''))).toBe('abc123');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[store_url]') || ''))).toBe('https://store-abc123.mybigcommerce.com');
    });

    it('should include optional connection parameters when provided', () => {
      const params = {
        connection_info: {
          access_token: 'test-token',
          client_id: '12345',
          store_hash: 'abc123',
          store_url: 'https://store-abc123.mybigcommerce.com',
          include: 'products,category_tree',
          filters: {
            is_visible: '1'
          },
          additional_parent_fields: 'price,sale_price',
          additional_variant_fields: 'price,sale_price',
          show_empty_fields: 'true',
          additional_image_sizes: true,
          to_columns: 'name,price',
          to_columns_keep_both: true
        }
      };

      const url = client.generateBigCommercePreprocessorUrl(params);
      const parsedUrl = new URL(url);
      const searchParams = new URLSearchParams(parsedUrl.search);

      // Compare decoded values to ensure they match the original input
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[include]') || ''))).toBe('products,category_tree');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[filters][is_visible]') || ''))).toBe('1');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[additional_parent_fields]') || ''))).toBe('price,sale_price');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[additional_variant_fields]') || ''))).toBe('price,sale_price');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[show_empty_fields]') || ''))).toBe('true');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[additional_image_sizes]') || ''))).toBe('true');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[to_columns]') || ''))).toBe('name,price');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[to_columns_keep_both]') || ''))).toBe('true');
    });

    it('should include file info parameters when provided', () => {
      const params = {
        connection_info: {
          access_token: 'test-token',
          client_id: '12345',
          store_hash: 'abc123',
          store_url: 'https://store-abc123.mybigcommerce.com'
        },
        file_info: {
          request_type: 'get',
          output_compressed: true
        }
      };

      const url = client.generateBigCommercePreprocessorUrl(params);
      const parsedUrl = new URL(url);
      const searchParams = new URLSearchParams(parsedUrl.search);

      expect(searchParams.get('file_info[request_type]')).toBe('get');
      expect(searchParams.get('file_info[output_compressed]')).toBe('true');
    });

    it('should handle null and undefined values', () => {
      const params = {
        connection_info: {
          access_token: 'test-token',
          client_id: '12345',
          store_hash: 'abc123',
          store_url: 'https://store-abc123.mybigcommerce.com',
          include: undefined,
          additional_options: undefined,
          price_list: {
            currencies: '',
            ids: ''
          }
        }
      };

      const url = client.generateBigCommercePreprocessorUrl(params);
      const parsedUrl = new URL(url);
      const searchParams = new URLSearchParams(parsedUrl.search);

      expect(searchParams.has('connection_info[include]')).toBe(false);
      expect(searchParams.has('connection_info[additional_options]')).toBe(false);
      expect(searchParams.get('connection_info[price_list][currencies]')).toBe('');
      expect(searchParams.get('connection_info[price_list][ids]')).toBe('');
    });

    it('should properly encode special characters in values', () => {
      const params = {
        connection_info: {
          access_token: 'test&token',
          client_id: '12345',
          store_hash: 'abc/123',
          store_url: 'https://store-abc123.mybigcommerce.com?param=value',
          additional_options: 'option1,option2&more'
        }
      };

      const url = client.generateBigCommercePreprocessorUrl(params);
      const parsedUrl = new URL(url);
      const searchParams = new URLSearchParams(parsedUrl.search);

      // Compare decoded values to ensure they match the original input
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[access_token]') || ''))).toBe('test&token');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[store_hash]') || ''))).toBe('abc/123');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[store_url]') || ''))).toBe('https://store-abc123.mybigcommerce.com?param=value');
      expect(decodeURIComponent(decodeURIComponent(searchParams.get('connection_info[additional_options]') || ''))).toBe('option1,option2&more');
      
      // Verify that the URL is properly encoded by checking that decoding it once still preserves special characters
      const decodedUrl = decodeURIComponent(url);
      const decodedParsedUrl = new URL(decodedUrl);
      const decodedSearchParams = new URLSearchParams(decodedParsedUrl.search);

      // Compare values from both URLs to ensure they match after double decoding
      expect(decodeURIComponent(decodeURIComponent(decodedSearchParams.get('connection_info[access_token]') || ''))).toBe('test&token');
      expect(decodeURIComponent(decodeURIComponent(decodedSearchParams.get('connection_info[store_hash]') || ''))).toBe('abc/123');
      expect(decodeURIComponent(decodeURIComponent(decodedSearchParams.get('connection_info[store_url]') || ''))).toBe('https://store-abc123.mybigcommerce.com?param=value');
      expect(decodeURIComponent(decodeURIComponent(decodedSearchParams.get('connection_info[additional_options]') || ''))).toBe('option1,option2&more');
    });
  });

  describe('vault operations', () => {
    it('should get vault entries', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: {
            vault_rows: [
              { id: 1, name: 'Entry 1' }
            ]
          }
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.vault();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/vault'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should update vault entry', async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, updated: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const entry: VaultEntry = {
        id: 1,
        name: 'Updated Entry',
        expiration: '2024-12-31',
        credentials_type: 'none',
        credentials: JSON.stringify({ key: 'value' })
      };
      const result = await client.updateVault(1, entry);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        url: '/vault/1',
        data: entry
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should delete vault entry', async () => {
      const mockResponse = {
        status: 200,
        data: { deleted: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.deleteVault(1);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'DELETE',
        url: '/vault/1'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should add vault entry to database', async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, name: 'DB Vault Entry' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const entry: VaultEntry = {
        name: 'DB Vault Entry',
        expiration: '2024-12-31',
        credentials_type: 'none',
        credentials: JSON.stringify({ key: 'value' })
      };
      const result = await client.addDbVaultEntry(1, entry);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/1/vault',
        data: entry
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should handle errors when adding vault entry to database', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Invalid vault entry data' }
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(errorResponse);
      
      const entry: VaultEntry = {
        name: 'DB Vault Entry',
        expiration: '2024-12-31',
        credentials_type: 'none',
        credentials: JSON.stringify({ key: 'value' })
      };
      
      const result = await client.addDbVaultEntry(1, entry);
      
      expect(result).toEqual({
        success: false,
        error: 'Invalid vault entry data',
        status: 400
      });
    });
  });

  describe('FTP methods', () => {
    it('should get FTP accounts', async () => {
      const mockResponse = {
        status: 200,
        data: [{ id: 1, username: 'ftpuser' }]
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.ftpAccounts();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/dbs/test-db-123/ftp'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create FTP accounts', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, username: 'newftpuser' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const ftpData = {
        username: 'newftpuser',
        password: 'password123'
      };
      
      const result = await client.createFtpAccounts(ftpData);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/test-db-123/ftp',
        data: ftpData
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });
  });

  describe('authentication methods', () => {
    it('should handle login', async () => {
      const mockResponse = {
        status: 200,
        data: { token: 'auth-token' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.login('testuser', 'testpass', 'Test User');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/login'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create BigCommerce account', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'BC Account' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.createBigCommerceAccount('Test Account');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/bigcommerce/account'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });
  });

  describe('feed build methods', () => {
    it('should apply automate build template', async () => {
      const mockResponse = {
        status: 200,
        data: { status: 'completed' }
      };

      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.applyAutomateBuildTemplate(123, 'template1');
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should get feed build', async () => {
      const mockResponse = {
        status: 200,
        data: { status: 'completed' }
      };

      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.feedBuild(123);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should cancel build', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Build cancelled' }
      };

      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.cancelBuild(123);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });

  describe('request handling', () => {
    it('should log verbose output when enabled', async () => {
      const verboseClient = new FdxClient({
        ...mockConfig,
        verbose: true
      });
      const consoleSpy = jest.spyOn(console, 'log');
      
      await verboseClient.accounts();
      
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '🔗 Full API URL: https://meta.feedonomics.com/api.php/user/accounts');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '🔐 API Key: [Set]');
      consoleSpy.mockRestore();
    });

    it('should handle API errors with custom error messages', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { 
            message: 'Custom error message'
          }
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(errorResponse);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'Custom error message',
        status: 400
      });
    });

    it('should handle API errors without error messages', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {}
        }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(errorResponse);
      
      const result = await client.accounts();
      
      expect(result).toEqual({
        success: false,
        error: 'API error',
        status: 500
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockRejectedValueOnce(networkError);

      const result = await client.request('GET', '/test');
      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle successful response with different status codes', async () => {
      const statusCodes = [200, 201, 204];
      const mockedClient = mockedAxios.create();
      
      for (const status of statusCodes) {
        const mockResponse = {
          status,
          data: { success: true }
        };
        
        (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
        
        const result = await client.request('GET', '/test');
        
        expect(result).toEqual({
          success: true,
          data: mockResponse.data,
          status
        });
      }
    });

    it('should handle request with config options', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const config = {
        headers: {
          'Custom-Header': 'value'
        },
        timeout: 5000
      };
      
      await client.request('GET', '/test', null, config);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        ...config,
        method: 'GET',
        url: '/test'
      }));
    });

    it('should handle request with data', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const data = { key: 'value' };
      await client.request('POST', '/test', data);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/test',
        data
      }));
    });

    it('should handle non-2xx response', async () => {
      const mockResponse = {
        status: 400,
        data: { message: 'Bad request' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.request('GET', '/test');
      
      expect(result).toEqual({
        success: false,
        error: 'Bad request',
        status: 400
      });
    });

    it('should handle successful response interceptor', async () => {
      const mockResponse = { data: 'test' };
      const _client = new FdxClient(mockConfig);
      const interceptor = (mockedAxios.create() as any).interceptors.response.use.mock.calls[0][0];
      
      const result = await interceptor(mockResponse);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('transformer methods', () => {
    it('should get all transformers', async () => {
      const mockResponse = { 
        status: 200, 
        data: [
          { 
            id: 1, 
            enabled: true,
            field_name: 'test',
            selector: 'true',
            transformer: 'uppercase([test])',
            export_id: [] 
          }
        ] 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.transformers();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: `/dbs/${client.getDbId()}/transformers`
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create a transformer', async () => {
      const mockResponse = { 
        status: 200, 
        data: { 
          id: 1, 
          enabled: true,
          field_name: 'test',
          selector: 'true',
          transformer: 'uppercase([test])',
          export_id: [] 
        } 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const transformerConfig = {
        enabled: true,
        field_name: 'test',
        selector: 'true',
        transformer: 'uppercase([test])',
        export_id: []
      };

      const result = await client.createTransformer(transformerConfig);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should update a transformer', async () => {
      const mockResponse = { 
        status: 200, 
        data: { 
          id: 1, 
          enabled: true,
          field_name: 'test',
          selector: 'true',
          transformer: 'lowercase([test])',
          export_id: [] 
        } 
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const transformerConfig = {
        enabled: true,
        field_name: 'test',
        selector: 'true',
        transformer: 'lowercase([test])',
        export_id: []
      };

      const result = await client.updateTransformer(1, transformerConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        url: `/dbs/${client.getDbId()}/transformers/1`,
        data: transformerConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should handle missing dbId for transformer methods', async () => {
      client.setDbId(undefined as any);
      
      const methods = [
        () => client.transformers(),
        () => client.createTransformer({} as any),
        () => client.updateTransformer(1, {} as any)
      ];
      
      for (const method of methods) {
        const result = await method();
        expect(result).toEqual({
          success: false,
          error: 'Database ID is required. Please set it using setDbId() first.'
        });
      }
    });
  });

  describe('database field methods', () => {
    it('should get db fields', async () => {
      const mockResponse = {
        status: 200,
        data: [{ id: 1, name: 'field1' }]
      };

      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.dbFields(1);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should update db fields', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };

      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const fieldsConfig = {
        fields: [
          { field_name: 'test', field_type: 'TEXT' }
        ]
      };

      const result = await client.updateDbFields(fieldsConfig);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should delete db field', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Field deleted' }
      };

      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await client.deleteDbField(1, 1);
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });

  describe('group methods', () => {
    it('should move database to group', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const movePayload = {
        db_id: 1,
        group_id: 2,
        group_name: 'Test Group'
      };
      
      const result = await client.moveDbToGroup(movePayload);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: `/groups/${movePayload.group_id}/dbs`,
        data: movePayload
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });

  describe('FTP management methods', () => {
    it('should handle missing dbId when getting FTP accounts', async () => {
      client.setDbId(undefined as any);
      
      const result = await client.ftpAccounts();
      
      expect(result).toEqual({
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      });
    });

    it('should handle missing dbId when creating FTP accounts', async () => {
      client.setDbId(undefined as any);
      
      const result = await client.createFtpAccounts({});
      
      expect(result).toEqual({
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      });
    });
  });

  describe('join import methods', () => {
    it('should get join imports', async () => {
      const mockResponse = {
        status: 200,
        data: [{ id: 1, name: 'Join Import 1' }]
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.joinImports();
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: `/dbs/${client.getDbId()}/join_imports`
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create join import', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'New Join Import' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const config = {
        name: 'New Join Import',
        file_name: 'join.csv',
        host: 'example.com',
        username: 'user',
        password: 'pass'
      };
      
      const result = await client.createJoinImport(config);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: `/dbs/${client.getDbId()}/join_imports`,
        data: config
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });
  });

  describe('group management methods', () => {
    it('should get groups for an account', async () => {
      const mockResponse = {
        status: 200,
        data: [{ id: 1, name: 'Group 1' }]
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.groups(1);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: '/accounts/1/groups'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should create group', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'New Group' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.createGroup('New Group');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/groups',
        data: { name: 'New Group' }
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });

    it('should move database to database group', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.moveDbintoNewDbGroup(1, 'Test Group');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/1/move_db_to_db_group',
        data: { 
          source_db_group_id: 0,
          target_db_group_id: -1,
          target_db_group_name: 'Test Group'
        }
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should move database from source to target db group', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.moveDbFromSourceToTargetDbGroup(1, 5, 10, 'Target Group');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/dbs/1/move_db_to_db_group',
        data: { 
          source_db_group_id: 5,
          target_db_group_id: 10,
          target_db_group_name: 'Target Group'
        }
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });

  describe('constructor options', () => {
    it('should use custom base URL when provided', () => {
      const customConfig = {
        ...mockConfig,
        baseUrl: 'https://custom.example.com'
      };
      
      const customClient = new FdxClient(customConfig);
      const details = customClient.getConnectionDetails();
      
      expect(details.baseUrl).toBe('https://custom.example.com');
    });

    it('should use custom timeout when provided', () => {
      const customConfig = {
        ...mockConfig,
        timeout: 30000
      };
      
      const _customClient = new FdxClient(customConfig);
      
      expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        timeout: 30000
      }));
    });

    it('should handle missing config values', () => {
      const minimalConfig = {
        apiToken: 'test-token'
      };
      
      const client = new FdxClient(minimalConfig as any);
      const details = client.getConnectionDetails();
      
      expect(details.baseUrl).toBe('https://meta.feedonomics.com/api.php');
      expect(details.verbose).toBe(false);
    });

    it('should handle response interceptor error', async () => {
      const error = new Error('Interceptor error');
      const consoleSpy = jest.spyOn(console, 'error');
      
      const _client = new FdxClient(mockConfig);
      const interceptor = (mockedAxios.create() as any).interceptors.response.use.mock.calls[0][1];
      
      await expect(interceptor(error)).rejects.toThrow('Interceptor error');
      expect(consoleSpy).toHaveBeenCalledWith('API Error:', 'Interceptor error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('database operations', () => {
    it('should handle database deletion', async () => {
      const mockResponse = {
        status: 200,
        data: { deleted: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.deleteDb(1);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'DELETE',
        url: '/dbs/1'
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });

    it('should handle database creation with minimal config', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'Test DB' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await client.createDb(1, 'Test DB');
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: '/accounts/1/dbs',
        data: { name: 'Test DB' }
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });
  });

  describe('import/export operations', () => {
    it('should handle import creation with full config', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'Test Import' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const importConfig = {
        name: 'Test Import',
        url: 'https://example.com/feed',
        additional_options: 'option1,option2',
        do_import: true
      };
      
      const result = await client.createImport(importConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: `/dbs/${client.getDbId()}/imports`,
        data: importConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });

    it('should handle export creation with full config', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, name: 'Test Export' }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const exportConfig = {
        name: 'Test Export',
        file_name: 'export.csv',
        protocol: 'sftp',
        host: 'example.com',
        username: 'user',
        password: 'pass',
        export_fields: [
          { field_name: 'id', export_field_name: 'id', required: 'true' }
        ],
        export_selector: "[status] = 'active'",
        tags: [
          { tag: 'type', value: 'product' }
        ]
      };
      
      const result = await client.createExport(exportConfig);
      
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: `/dbs/${client.getDbId()}/exports`,
        data: exportConfig
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 201
      });
    });

    it('should handle import and export scheduling', async () => {
      const mockResponse = {
        status: 200,
        data: { scheduled: true }
      };
      
      const mockedClient = mockedAxios.create();
      (mockedClient.request as jest.Mock)
        .mockResolvedValueOnce(mockResponse)  // For import schedule
        .mockResolvedValueOnce(mockResponse); // For export schedule
      
      const schedule = {
        day: '*',
        hour: '1',
        minute: '30'
      };
      
      // Test import scheduling
      let result = await client.updateImportSchedule(1, schedule);
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        url: `/dbs/${client.getDbId()}/imports/1/schedule`,
        data: schedule
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
      
      // Test export scheduling
      result = await client.scheduleExport(1, schedule);
      expect(mockedClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: `/dbs/${client.getDbId()}/exports/1/schedule`,
        data: schedule
      }));
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        status: 200
      });
    });
  });
}); 