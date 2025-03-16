import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  ServiceResponse,
  FeedonomicsConfig,
  Account,
  Database,
  VaultEntry,
  ImportConfig,
  ExportConfig,
  Transformer,
  JoinImportConfig,
  Schedule,
  Group,
  GroupMovePayload
} from '../types';

/**
 * Main client for interacting with the Feedonomics API
 */
export class FdxClient {
  private client: AxiosInstance;
  private apiToken: string;
  private dbId?: string;
  private baseUrl: string;
  private config: FeedonomicsConfig;
  private verbose: boolean;

  /**
   * Create a new FdxClient instance
   * @param config - Feedonomics API configuration
   */
  constructor(config: FeedonomicsConfig) {
    if (!config) {
      throw new Error('Config is required');
    }
    if (!config.apiToken) {
      throw new Error('API key is required');
    }

    this.apiToken = config.apiToken;
    this.dbId = config.dbId;
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://meta.feedonomics.com/api.php';
    this.verbose = config.verbose || false;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': this.apiToken
      }
    });

    // Add response interceptor to standardize responses
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Log verbose information about the API request
   * @param endpoint - API endpoint being called
   */
  private logVerbose(endpoint: string) {
    if (this.verbose) {
      console.log(`🔗 Full API URL: ${this.baseUrl}${endpoint}`);
      console.log(`🔐 API Key: ${this.apiToken ? '[Set]' : '[Not Set]'}`);
    }
  }

  /**
   * Process API response into standard format
   * @param response - Axios response
   * @returns ServiceResponse with standardized format
   */
  private processResponse<T>(response: AxiosResponse): ServiceResponse<T> {
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    }

    return {
      success: false,
      error: response.data?.message || 'Unknown error',
      status: response.status
    };
  }

  /**
   * Make an API request
   * @param method - HTTP method
   * @param url - API endpoint
   * @param data - Request data
   * @param config - Axios request config
   * @returns ServiceResponse with result
   */
  async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ServiceResponse<T>> {
    try {
      this.logVerbose(url);
      const response = await this.client.request({
        method,
        url,
        data,
        ...config
      });

      return this.processResponse<T>(response);
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.message || 'API error',
          status: error.response.status
        };
      }

      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  /**
   * Get connection details for debugging
   * @returns Connection details object
   */
  getConnectionDetails() {
    return {
      baseUrl: this.baseUrl,
      apiKeySet: this.apiToken ? '[Set]' : '[Not Set]',
      verbose: this.verbose
    };
  }

  // User Management Methods

  /**
   * Invite a primary user to an account
   * @param accountId - Account ID
   * @param email - Email address of the user to invite
   * @returns Response with invitation status
   */
  async invitePrimaryUser(accountId: string | number, email: string): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', `/accounts/${accountId}/user_account_permissions`, {
      permissions: 'primary',
      username: email
    });
  }

  // Feed Build Methods

  /**
   * Apply an automated feed build template
   * @param importId - Import ID to apply the template to
   * @param templateName - Name of the template to apply
   * @returns Response with build status
   */
  async applyAutomateBuildTemplate(importId: string | number, templateName: string): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }

    return this.request<any>('POST', `/dbs/${this.dbId}/apply_automate_build_template`, {
      import_id: importId,
      template_name: templateName
    });
  }

  /**
   * Get feed build status
   * @param buildId - Build ID
   * @returns Response with build status
   */
  async feedBuild(buildId: string | number): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('GET', `/dbs/${this.dbId}/builds/${buildId}`);
  }

  /**
   * Cancel a running build
   * @param buildId - Build ID
   * @returns Response with cancellation status
   */
  async cancelBuild(buildId: string | number): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/builds/${buildId}/cancel`);
  }

  // Account Management Methods

  /**
   * Get all accounts
   * @returns List of accounts
   */
  async accounts(): Promise<ServiceResponse<Account[]>> {
    return this.request<Account[]>('GET', '/user/accounts');
  }

  /**
   * Get databases for an account
   * @param accountId - Account ID
   * @returns List of databases
   */
  async dbs(accountId: string | number): Promise<ServiceResponse<Database[]>> {
    return this.request<Database[]>('GET', `/accounts/${accountId}/dbs`);
  }

  /**
   * Create a new database
   * @param accountId - Account ID
   * @param dbName - Database name
   * @returns Created database
   */
  async createDb(accountId: string | number, dbName: string): Promise<ServiceResponse<Database>> {
    return this.request<Database>('POST', `/accounts/${accountId}/dbs`, {
      name: dbName
    });
  }

  /**
   * Delete a database
   * @param dbId - Database ID
   * @returns Response with deletion status
   */
  async deleteDb(dbId: string | number): Promise<ServiceResponse<any>> {
    return this.request<any>('DELETE', `/dbs/${dbId}`);
  }

  // Vault Management Methods

  /**
   * Get vault entries
   * @returns List of vault entries
   */
  async vault(): Promise<ServiceResponse<{ data: { vault_rows: VaultEntry[] } }>> {
    return this.request<{ data: { vault_rows: VaultEntry[] } }>('GET', '/vault');
  }

  /**
   * Create a vault entry
   * @param entry - Vault entry data
   * @returns Created vault entry
   */
  async createVault(entry: VaultEntry): Promise<ServiceResponse<VaultEntry>> {
    return this.request<VaultEntry>('POST', '/vault', entry);
  }

  /**
   * Update a vault entry
   * @param id - Vault entry ID
   * @param entry - Updated vault entry data
   * @returns Updated vault entry
   */
  async updateVault(id: string | number, entry: VaultEntry): Promise<ServiceResponse<VaultEntry>> {
    return this.request<VaultEntry>('PUT', `/vault/${id}`, entry);
  }

  /**
   * Delete a vault entry
   * @param id - Vault entry ID
   * @returns Response with deletion status
   */
  async deleteVault(id: string | number): Promise<ServiceResponse<any>> {
    return this.request<any>('DELETE', `/vault/${id}`);
  }

  // FTP Management Methods

  /**
   * Get FTP accounts
   * @returns List of FTP accounts
   */
  async ftpAccounts(): Promise<ServiceResponse<any[]>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any[]>('GET', `/dbs/${this.dbId}/ftp`);
  }

  /**
   * Create FTP account
   * @param data - FTP account data
   * @returns Created FTP account
   */
  async createFtpAccounts(data: any): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/ftp`, data);
  }

  // Import Management Methods

  /**
   * Get all imports
   * @returns List of imports
   */
  async imports(): Promise<ServiceResponse<any[]>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any[]>('GET', `/dbs/${this.dbId}/imports`);
  }

  /**
   * Create an import configuration
   * @param importConfig - Import configuration
   * @returns Created import
   */
  async createImport(importConfig: ImportConfig): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/imports`, importConfig);
  }

  /**
   * Update an import configuration
   * @param importId - Import ID
   * @param importConfig - Updated import configuration
   * @returns Updated import
   */
  async updateImport(importId: string | number, importConfig: ImportConfig): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('PUT', `/dbs/${this.dbId}/imports/${importId}`, importConfig);
  }

  /**
   * Update an import schedule
   * @param importId - Import ID
   * @param schedule - Schedule configuration
   * @returns Updated import schedule
   */
  async updateImportSchedule(importId: string | number, schedule: Schedule): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('PUT', `/dbs/${this.dbId}/imports/${importId}/schedule`, schedule);
  }

  // Export Management Methods

  /**
   * Get all exports
   * @returns List of exports
   */
  async exports(): Promise<ServiceResponse<any[]>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any[]>('GET', `/dbs/${this.dbId}/exports`);
  }

  /**
   * Create an export configuration
   * @param exportConfig - Export configuration
   * @returns Created export
   */
  async createExport(exportConfig: ExportConfig): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/exports`, exportConfig);
  }

  /**
   * Update an export configuration
   * @param exportId - Export ID
   * @param exportConfig - Updated export configuration
   * @returns Updated export
   */
  async updateExport(exportId: string | number, exportConfig: ExportConfig): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('PUT', `/dbs/${this.dbId}/exports/${exportId}`, exportConfig);
  }

  /**
   * Schedule an export
   * @param exportId - Export ID
   * @param schedule - Schedule configuration
   * @returns Scheduled export
   */
  async scheduleExport(exportId: string | number, schedule: Schedule): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/exports/${exportId}/schedule`, schedule);
  }

  // Transformer Management Methods

  /**
   * Get all transformers
   * @returns List of transformers
   */
  async transformers(): Promise<ServiceResponse<any[]>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any[]>('GET', `/dbs/${this.dbId}/transformers`);
  }

  /**
   * Create a transformer
   * @param transformer - Transformer configuration
   * @returns Created transformer
   */
  async createTransformer(transformer: Transformer): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/transformers`, transformer);
  }

  /**
   * Update a transformer
   * @param transformerId - Transformer ID
   * @param transformer - Updated transformer configuration
   * @returns Updated transformer
   */
  async updateTransformer(transformerId: string | number, transformer: Transformer): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('PUT', `/dbs/${this.dbId}/transformers/${transformerId}`, transformer);
  }

  /**
   * Update database fields
   * @param data - Field data
   * @returns Updated database fields
   */
  async updateDbFields(data: any): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('PUT', `/dbs/${this.dbId}/fields`, data);
  }

  // Join Import Methods

  /**
   * Create a join import
   * @param joinImportConfig - Join import configuration
   * @returns Created join import
   */
  async createJoinImport(joinImportConfig: JoinImportConfig): Promise<ServiceResponse<any>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any>('POST', `/dbs/${this.dbId}/join_imports`, joinImportConfig);
  }

  /**
   * Get all join imports
   * @returns List of join imports
   */
  async joinImports(): Promise<ServiceResponse<any[]>> {
    if (!this.dbId) {
      return {
        success: false,
        error: 'Database ID is required. Please set it using setDbId() first.'
      };
    }
    return this.request<any[]>('GET', `/dbs/${this.dbId}/join_imports`);
  }

  // Group Management Methods

  /**
   * Get groups for an account
   * @param accountId - Account ID
   * @returns List of groups
   */
  async groups(accountId: string | number): Promise<ServiceResponse<Group[]>> {
    return this.request<Group[]>('GET', `/accounts/${accountId}/groups`);
  }

  /**
   * Create a group
   * @param groupName - Group name
   * @returns Created group
   */
  async createGroup(groupName: string): Promise<ServiceResponse<Group>> {
    return this.request<Group>('POST', `/groups`, {
      name: groupName
    });
  }

  /**
   * Move database to a group
   * @param payload - Group move payload
   * @returns Updated database
   */
  async moveDbToGroup(payload: GroupMovePayload): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', `/groups/${payload.group_id}/dbs`, payload);
  }

  /**
   * Set the current database ID
   * @param dbId - Database ID
   */
  setDbId(dbId: string) {
    this.dbId = dbId;
  }

  /**
   * Get the current database ID
   * @returns The current database ID
   */
  getDbId(): string | undefined {
    return this.dbId;
  }

  // Authentication Methods

  /**
   * Generate authentication token for BigCommerce user
   * @param username - Username for authentication
   * @param password - Password for authentication
   * @param name - Name for authentication
   * @returns Authentication response
   */
  async login(username: string, password: string, name: string): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', '/login', {
      username,
      password,
      method: 'token',
      name
    });
  }

  /**
   * Create a new BigCommerce account
   * @param name - Name for the BigCommerce account
   * @returns Created account details
   */
  async createBigCommerceAccount(name: string): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', '/bigcommerce/account', {
      name
    });
  }

  /**
   * Move database into a new database group
   * @param dbId - Database ID to move
   * @param targetGroupName - Name of the group to create
   * @returns Empty response status code
   */
  async moveDbintoNewDbGroup(
    dbId: string | number, 
    targetGroupName: string
  ): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', `/dbs/${dbId}/move_db_to_db_group`, {
      source_db_group_id: 0, // Always 0 as source (no current group)
      target_db_group_id: -1, // Always -1 to create a new group if it doesn't exist
      target_db_group_name: targetGroupName
    });
  }

  /**
   * Move database from a source group to a target group
   * @param dbId - Database ID to move
   * @param sourceGroupId - The current database db_group_id (or 0 if none)
   * @param targetGroupId - The DB Group ID to assign (use -1 to create a new group)
   * @param targetGroupName - If creating a new DB group then this is the name (required when target_db_group_id is -1)
   * @returns Empty response status code
   */
  async moveDbFromSourceToTargetDbGroup(
    dbId: string | number,
    sourceGroupId: number, 
    targetGroupId: number,
    targetGroupName: string = ""
  ): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', `/dbs/${dbId}/move_db_to_db_group`, {
      source_db_group_id: sourceGroupId,
      target_db_group_id: targetGroupId,
      target_db_group_name: targetGroupName
    });
  }

  /**
   * Add a vault entry to a database
   * @param dbId - Database ID
   * @param entry - Vault entry data
   * @returns Created vault entry
   */
  async addDbVaultEntry(dbId: string | number, entry: VaultEntry): Promise<ServiceResponse<any>> {
    return this.request<any>('POST', `/dbs/${dbId}/vault`, entry);
  }

  /**
   * Generate BigCommerce preprocessor URL with the given parameters
   * @param params - Connection and file info parameters
   * @returns Preprocessor URL with encoded parameters
   */
  generateBigCommercePreprocessorUrl(params: {
    connection_info: {
      access_token: string;
      client_id: string | number;
      include?: string;
      filters?: Record<string, any>;
      price_list?: {
        currencies: string;
        ids: string;
      };
      location_inventory?: {
        ids: string;
      };
      store_hash: string;
      store_url: string;
      show_empty_fields?: string;
      additional_image_sizes?: boolean;
      additional_options?: string;
      additional_parent_fields?: string;
      additional_variant_fields?: string;
      to_columns?: string;
      to_columns_keep_both?: boolean;
    };
    file_info?: {
      request_type?: string;
      output_compressed?: boolean;
    };
  }): string {
    const baseUrl = 'https://preprocess.proxy.feedonomics.com/preprocess/run_preprocess.php';
    const searchParams = new URLSearchParams();

    // Helper function to add parameters
    const addParam = (prefix: string, key: string, value: any) => {
      if (value !== undefined && value !== null) {
        // Double encode special characters to preserve them through URL parsing
        const encodedValue = encodeURIComponent(encodeURIComponent(String(value)));
        searchParams.set(`${prefix}[${key}]`, encodedValue);
      }
    };

    // Helper function to add nested parameters
    const addNestedParam = (prefix: string, key: string, subKey: string, value: any) => {
      if (value !== undefined && value !== null) {
        // Double encode special characters to preserve them through URL parsing
        const encodedValue = encodeURIComponent(encodeURIComponent(String(value)));
        searchParams.set(`${prefix}[${key}][${subKey}]`, encodedValue);
      }
    };

    // Add base connection info
    addParam('connection_info', 'client', 'bigcommerce');
    addParam('connection_info', 'protocol', 'api');

    // Add connection info parameters
    for (const [key, value] of Object.entries(params.connection_info)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          for (const [subKey, subValue] of Object.entries(value)) {
            if (subValue !== undefined && subValue !== null) {
              addNestedParam('connection_info', key, subKey, subValue);
            }
          }
        } else {
          addParam('connection_info', key, value);
        }
      }
    }

    // Add file info parameters if provided
    if (params.file_info) {
      for (const [key, value] of Object.entries(params.file_info)) {
        if (value !== undefined && value !== null) {
          addParam('file_info', key, value);
        }
      }
    }

    return `${baseUrl}?${searchParams.toString()}`;
  }

  /**
   * Get database fields
   * @param dbId - Database ID
   * @returns List of database fields
   */
  async dbFields(dbId: string | number): Promise<ServiceResponse<any[]>> {
    return this.request<any[]>('GET', `/dbs/${dbId}/fields`);
  }

  /**
   * Delete a database field
   * @param dbId - Database ID
   * @param fieldId - Field ID
   * @returns Response with deletion status
   */
  async deleteDbField(dbId: string | number, fieldId: string | number): Promise<ServiceResponse<any>> {
    return this.request<any>('DELETE', `/dbs/${dbId}/fields/${fieldId}`);
  }
} 