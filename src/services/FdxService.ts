import { FdxClient } from '../lib/FdxClient';
import {
  ServiceResponse,
  ImportConfig,
  ExportConfig,
  Transformer,
  JoinImportConfig,
  Schedule,
  FtpCredentials,
  VaultEntry,
  ConnectionInfo,
  ExportField,
  BigCommerceSetupParams,
  BigCommerceSetupResult
} from '../types';

/**
 * Main service to interact with Feedonomics API
 */
export class FdxService {
  private client: FdxClient;
  private MAIN_IMPORT_NAME = 'BigCommerceImport';
  private JOIN_IMPORT_NAME = 'Extra Google Fields';
  private EXPORT_NAME = 'Export Google';
  private static ACCOUNT_PREFIX = 'BC-';

  /**
   * Create a new FdxService instance
   * @param client - FdxClient instance
   */
  constructor(client: FdxClient) {
    this.client = client;
  }

  // Channel Association Methods

  /**
   * Retrieve available accounts
   * @returns Service response with accounts mapped by name
   */
  async retrieveAccounts(): Promise<ServiceResponse<Record<string, any>>> {
    const result = await this.client.accounts();
    if (!result.success) {
      return {
        success: false,
        error: `Error getting accounts: ${result.error}`
      };
    }

    const accounts = result.data?.reduce((acc: Record<string, any>, account: any) => {
      acc[account.account_name] = account;
      return acc;
    }, {}) || {};

    return {
      success: true,
      data: accounts
    };
  }

  /**
   * Get or create an account
   * @param storeId - Store ID for account name generation
   * @returns Service response with account
   */
  async getOrCreateAccount(storeId: string | number): Promise<ServiceResponse<any>> {
    const accountName = this.getAccountName(storeId);
    const accountsResult = await this.retrieveAccounts();
    
    if (!accountsResult.success) {
      return accountsResult;
    }

    const account = accountsResult.data?.[accountName];
    if (account) {
      return {
        success: true,
        data: account
      };
    }

    return this.createAccount(accountName);
  }

  /**
   * Create a new account
   * @param accountName - Account name
   * @returns Service response with created account
   */
  async createAccount(accountName: string): Promise<ServiceResponse<any>> {
    const result = await this.client.createBigCommerceAccount(accountName);
    if (!result.success) {
      return {
        success: false,
        error: `Error creating account: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Move database to a group
   * @param accountId - Account ID
   * @param accountName - Account name for group
   * @returns Service response with result
   */
  async moveDbToGroup(accountId: string | number, accountName: string): Promise<ServiceResponse<any>> {
    const existingGroupResult = await this.findGroup(accountId);
    if (!existingGroupResult.success) {
      return existingGroupResult;
    }

    let result;
    if (existingGroupResult.data) {
      const payload = {
        db_id: 0,
        group_id: existingGroupResult.data.id,
        group_name: accountName
      };
      result = await this.client.moveDbToGroup(payload);
    } else {
      result = await this.client.createGroup(accountName);
    }

    if (!result.success) {
      return {
        success: false,
        error: `Error moving db to group: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Update vault entries
   * @param accessToken - Access token for vault
   * @returns Service response with result
   */
  async updateVaultEntries(accessToken: string): Promise<ServiceResponse<any>> {
    const vaultResult = await this.client.vault();
    if (!vaultResult.success) {
      return {
        success: false,
        error: `Error getting vaults: ${vaultResult.error}`
      };
    }

    const entries = vaultResult.data?.data?.vault_rows || [];
    const deleteResult = await this.deleteOldEntry(entries);
    if (deleteResult && !deleteResult.success) {
      return deleteResult;
    }
    
    return this.createOrUpdateVaultEntry(entries, accessToken);
  }

  /**
   * Get FTP credentials
   * @returns Service response with FTP credentials
   */
  async getFtpCredentials(): Promise<ServiceResponse<any>> {
    const ftpResponse = await this.client.ftpAccounts();
    if (!ftpResponse.success) {
      return {
        success: false,
        error: `Error getting credentials: ${ftpResponse.error}`
      };
    }

    if (ftpResponse.data && ftpResponse.data.length > 0) {
      return {
        success: true,
        data: ftpResponse.data
      };
    }

    const createFtpResponse = await this.client.createFtpAccounts({});
    if (!createFtpResponse.success) {
      return {
        success: false,
        error: `Error creating FTP credentials: ${createFtpResponse.error}`
      };
    }

    return {
      success: true,
      data: createFtpResponse.data
    };
  }

  /**
   * Delete a database
   * @param dbId - Database ID
   * @returns Service response with result
   */
  async deleteDb(dbId: string | number): Promise<ServiceResponse<any>> {
    const result = await this.client.deleteDb(dbId);
    if (!result.success) {
      return {
        success: false,
        error: `Error deleting db: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Create a database
   * @param accountId - Account ID
   * @param dbName - Database name
   * @returns Service response with created database
   */
  async createDb(accountId: string | number, dbName: string): Promise<ServiceResponse<any>> {
    const result = await this.client.createDb(accountId, dbName);
    if (!result.success) {
      return {
        success: false,
        error: `Error creating db: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  // Import Methods

  /**
   * Retrieve the main import
   * @returns Service response with import
   */
  async retrieveImport(): Promise<ServiceResponse<any>> {
    const imports = await this.client.imports();
    if (!imports.success) {
      return {
        success: false,
        error: `Error getting imports: ${imports.error}`
      };
    }

    const import_ = imports.data?.find((i: any) => i.name === this.MAIN_IMPORT_NAME) || null;
    return {
      success: true,
      data: import_
    };
  }

  /**
   * Create or update import
   * @param user - User data with store info
   * @param channelId - Channel ID
   * @param isCreate - Whether to create or update
   * @returns Service response with import
   */
  async createOrUpdateImport(
    user: { id: string | number; storeHash: string },
    channelId: number,
    isCreate = true
  ): Promise<ServiceResponse<any>> {
    const importConfig = this.buildImportConfig(user, channelId, isCreate);
    
    const existingImport = await this.retrieveImport();
    if (existingImport.success && existingImport.data) {
      const result = await this.client.updateImport(existingImport.data.id, importConfig);
      if (!result.success) {
        return {
          success: false,
          error: `Error updating import: ${result.error}`
        };
      }
      return {
        success: true,
        data: existingImport.data
      };
    }
    
    const result = await this.client.createImport(importConfig);
    if (!result.success) {
      return {
        success: false,
        error: `Error creating import: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Update import schedule
   * @param importId - Import ID
   * @param day - Schedule day (e.g., '*' for every day)
   * @param hour - Schedule hour (e.g., '1,2' for 1AM and 2AM)
   * @param minute - Schedule minute (e.g., '0' for on the hour)
   * @returns Service response with updated import schedule
   */
  async updateImportSchedule(importId: string | number, day: string, hour: string, minute: string): Promise<ServiceResponse<any>> {
    const schedule: Schedule = { day, hour, minute };
    const result = await this.client.updateImportSchedule(importId, schedule);
    if (!result.success) {
      return {
        success: false,
        error: `Error updating import schedule: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  // Export Methods

  /**
   * Create or update export
   * @param ftpCredentials - FTP credentials
   * @param filename - File name
   * @param timeSlot - Time slot
   * @returns Service response with export
   */
  async createOrUpdateExport(
    ftpCredentials: FtpCredentials,
    filename: string,
    timeSlot?: { hour: string; minutes: string }
  ): Promise<ServiceResponse<any>> {
    const currentExportResponse = await this.getExistingExport();
    if (!currentExportResponse.success) {
      return {
        success: false,
        error: `Getting existing export: ${currentExportResponse.error}`
      };
    }

    const export_ = await this.handleExistingExport(currentExportResponse.data, ftpCredentials, filename);
    if (!export_.success) {
      return {
        success: false,
        error: `Creating or updating exports: ${export_.error}`
      };
    }

    if (timeSlot) {
      return this.runExportSchedule(export_.data, timeSlot);
    }

    return export_;
  }

  /**
   * Get existing export
   * @returns Service response with export
   */
  async getExistingExport(): Promise<ServiceResponse<any>> {
    const exports = await this.client.exports();
    if (!exports.success) {
      return {
        success: false,
        error: `Error getting exports: ${exports.error}`
      };
    }

    const export_ = exports.data?.find((i: any) => i.name === this.EXPORT_NAME) || null;
    return {
      success: true,
      data: export_
    };
  }

  // Transformer Methods

  /**
   * Create transformers
   * @param transformers - Array of transformer configs
   * @returns Service response with transformers
   */
  async createTransformers(transformers: Transformer[]): Promise<ServiceResponse<any[]>> {
    const results: any[] = [];
    
    for (const transformer of transformers) {
      const result = await this.client.createTransformer(transformer);
      if (!result.success) {
        return {
          success: false,
          error: `Error creating transformer: ${result.error}`
        };
      }
      results.push(result.data);
    }

    return {
      success: true,
      data: results
    };
  }

  /**
   * Update database fields
   * @param fields - Array of field configs
   * @returns Service response with updated fields
   */
  async updateDbFields(fields: any[]): Promise<ServiceResponse<any[]>> {
    const results: any[] = [];
    
    for (const field of fields) {
      const result = await this.client.updateDbFields(field);
      if (!result.success) {
        return {
          success: false,
          error: `Error updating db fields: ${result.error}`
        };
      }
      results.push(result.data);
    }

    return {
      success: true,
      data: results
    };
  }

  // Join Import Methods

  /**
   * Create join import
   * @param ftpCredentials - FTP credentials
   * @param fileName - File name
   * @returns Service response with join import
   */
  async createJoinImport(ftpCredentials: FtpCredentials, fileName: string): Promise<ServiceResponse<any>> {
    const joinImportConfig: JoinImportConfig = {
      name: this.JOIN_IMPORT_NAME,
      file_name: fileName,
      host: ftpCredentials.host,
      username: ftpCredentials.username,
      password: ftpCredentials.password
    };

    const result = await this.client.createJoinImport(joinImportConfig);
    if (!result.success) {
      return {
        success: false,
        error: `Error creating join import: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  // Helper Methods

  /**
   * Find a group by account ID
   * @param accountId - Account ID
   * @returns Service response with group
   */
  private async findGroup(accountId: string | number): Promise<ServiceResponse<any>> {
    const result = await this.client.groups(accountId);
    if (!result.success) {
      return {
        success: false,
        error: `Error getting db groups: ${result.error}`
      };
    }

    const accountName = result.data?.find((group: any) => group.name.startsWith(FdxService.ACCOUNT_PREFIX));
    return {
      success: true,
      data: accountName
    };
  }

  /**
   * Delete old vault entry
   * @param entries - Array of vault entries
   * @returns Service response with deletion result
   */
  private async deleteOldEntry(entries: VaultEntry[]): Promise<ServiceResponse<any> | null> {
    const oldEntry = entries.find((entry) => entry.name === 'BigCommerce Credentials');
    if (!oldEntry) {
      return null;
    }

    const result = await this.client.deleteVault(oldEntry.id!);
    if (!result.success) {
      return {
        success: false,
        error: `Error deleting vault: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Create or update vault entry
   * @param entries - Array of vault entries
   * @param accessToken - Access token
   * @returns Service response with vault entry
   */
  private async createOrUpdateVaultEntry(entries: VaultEntry[], accessToken: string): Promise<ServiceResponse<any>> {
    const entry = entries.find((e) => e.name === 'bc_credentials');
    const entryPayload: VaultEntry = {
      name: 'bc_credentials',
      expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Set expiration to 1 year from now
      credentials_type: "none",
      credentials: JSON.stringify({ access_token: accessToken })
    };

    let result;
    if (entry) {
      result = await this.client.updateVault(entry.id!, entryPayload);
    } else {
      result = await this.client.createVault(entryPayload);
    }

    if (!result?.success) {
      return {
        success: false,
        error: `Error creating vault: ${result?.error || 'Unknown error'}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Handle existing export
   * @param existingExport - Existing export config
   * @param ftpCredentials - FTP credentials
   * @param filename - File name
   * @returns Service response with export
   */
  private async handleExistingExport(existingExport: any, ftpCredentials: FtpCredentials, filename: string): Promise<ServiceResponse<any>> {
    const exportConfig = this.buildExportConfig(ftpCredentials, filename);
    
    if (existingExport) {
      const result = await this.client.updateExport(existingExport.id, exportConfig);
      if (!result.success) {
        return {
          success: false,
          error: `Error updating exports: ${result.error}`
        };
      }
      return {
        success: true,
        data: existingExport
      };
    }
    
    const result = await this.client.createExport(exportConfig);
    if (!result.success) {
      return {
        success: false,
        error: `Error creating exports: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Run export schedule
   * @param export_ - Export config
   * @param timeSlot - Time slot
   * @returns Service response with scheduled export
   */
  private async runExportSchedule(export_: any, timeSlot: { hour: string; minutes: string }): Promise<ServiceResponse<any>> {
    const schedule: Schedule = {
      day: '*',
      hour: timeSlot.hour,
      minute: timeSlot.minutes
    };

    const result = await this.client.scheduleExport(export_.id, schedule);
    if (!result.success) {
      return {
        success: false,
        error: 'Error setting running export schedule in FDX'
      };
    }

    return {
      success: true,
      data: export_
    };
  }

  /**
   * Build import configuration
   * @param user - User data
   * @param channelId - Channel ID
   * @param isCreate - Whether to create or update
   * @returns Import configuration
   */
  private buildImportConfig(
    user: { id: string | number; storeHash: string },
    channelId: number,
    isCreate: boolean
  ): ImportConfig {
    const mode = isCreate ? 'create' : 'update';
    const connectionInfo = this.buildConnectionInfo(user, [channelId], mode);
    
    const importConfig: ImportConfig = {
      name: this.MAIN_IMPORT_NAME,
      additional_options: 'google_field,category_tree',
      url: this.buildImportUrl(user, channelId, mode),
      preprocess_info: {
        connection_info: connectionInfo
      }
    };
    
    if (!isCreate) {
      importConfig.do_import = false;
    }
    
    return importConfig;
  }

  /**
   * Build import URL
   * @param user - User data
   * @param channelId - Channel ID
   * @param mode - Import mode
   * @returns Import URL
   */
  private buildImportUrl(
    user: { id: string | number; storeHash: string },
    channelId: number,
    mode: string
  ): string {
    const connectionInfo = this.buildConnectionInfo(user, [channelId], mode);
    
    return this.client.generateBigCommercePreprocessorUrl({
      connection_info: connectionInfo,
      file_info: { request_type: 'get' }
    });
  }

  /**
   * Build connection info for import
   * @param user - User data
   * @param channelIds - Channel IDs
   * @param mode - Import mode
   * @returns Connection info object
   */
  private buildConnectionInfo(
    user: { id: string | number; storeHash: string },
    channelIds: number[] | number,
    mode: string
  ): ConnectionInfo {
    const payload: ConnectionInfo = {
      access_token: `{{feedonomics::vault::bc_credentials::access_token}}`,
      client_id: user.id,
      store_hash: user.storeHash,
      store_url: `https://store-${user.storeHash}.mybigcommerce.com`,
      channel_ids: channelIds,
      filters: { is_visible: 1 },
      include: 'products',
      additional_parent_fields: 'price,sale_price',
      additional_variant_fields: 'price,sale_price'
    };
    
    payload.pull_sample = mode === 'create' ? 1 : 0;
    return payload;
  }

  /**
   * Build export configuration
   * @param ftpCredentials - FTP credentials
   * @param filename - File name
   * @returns Export configuration
   */
  private buildExportConfig(ftpCredentials: FtpCredentials, filename: string): ExportConfig {
    return {
      name: this.EXPORT_NAME,
      file_name: filename,
      protocol: 'sftp',
      host: ftpCredentials.host,
      username: ftpCredentials.username,
      password: ftpCredentials.password,
      export_fields: this.getExportFields(),
      export_selector: "[can_export] equal 'true'",
      tags: [
        {
          tag: 'export_template',
          value: 'google_shopping'
        }
      ]
    };
  }

  /**
   * Get export fields mapping
   * @returns Array of export field mappings
   */
  private getExportFields(): ExportField[] {
    // This would typically be loaded from configuration
    const exportFieldMap: Record<string, string> = {
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

    return Object.entries(exportFieldMap).map(([exportFieldName, fieldName]) => ({
      field_name: fieldName,
      export_field_name: exportFieldName,
      required: ''
    }));
  }

  /**
   * Get account name from store ID
   * @param storeId - Store ID
   * @returns Account name
   */
  private getAccountName(storeId: string | number): string {
    return `${FdxService.ACCOUNT_PREFIX}${storeId}`;
  }

  /**
   * Runs an import immediately
   * @param importId The ID of the import to run
   * @returns API response
   */
  async runImport(importId: string): Promise<ServiceResponse<any>> {
    const dbId = this.client.getDbId();
    if (!dbId) {
      return {
        success: false,
        error: 'No database selected'
      };
    }

    const result = await this.client.request('POST', `/dbs/${dbId}/imports/${importId}/run`, {});
    if (!result.success) {
      return {
        success: false,
        error: `Error running import: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Runs an export immediately
   * @param exportId The ID of the export to run
   * @returns API response
   */
  async runExport(exportId: string): Promise<ServiceResponse<any>> {
    const dbId = this.client.getDbId();
    if (!dbId) {
      return {
        success: false,
        error: 'No database selected'
      };
    }

    const result = await this.client.request('POST', `/dbs/${dbId}/exports/${exportId}/run`, {});
    if (!result.success) {
      return {
        success: false,
        error: `Error running export: ${result.error}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Set up a complete BigCommerce integration
   * @param params - Setup parameters
   * @returns Setup result
   */
  async setupBigCommerceIntegration(params: BigCommerceSetupParams): Promise<ServiceResponse<BigCommerceSetupResult>> {
    try {
      // Step 1: Create BigCommerce account
      const accountResult = await this.client.createBigCommerceAccount(params.accountName);
      if (!accountResult.success || !accountResult.data?.id) {
        return {
          success: false,
          error: `Failed to create account: ${accountResult.error}`
        };
      }
      const accountId = accountResult.data.id;

      // Step 2: Invite primary user if email provided
      const primaryUserEmail = params.userEmail;
      if (primaryUserEmail) {
        const inviteResult = await this.client.invitePrimaryUser(accountId, primaryUserEmail);
        if (!inviteResult.success) {
          return {
            success: false,
            error: `Failed to invite user: ${inviteResult.error}`
          };
        }
      }

      // Step 3: Create database
      const dbName = params.dbName || `BC Store ${params.storeHash}`;
      const dbResult = await this.client.createDb(accountId, dbName);
      if (!dbResult.success || !dbResult.data?.id) {
        return {
          success: false,
          error: `Failed to create database: ${dbResult.error}`
        };
      }
      const dbId = dbResult.data.id;
      this.client.setDbId(dbId.toString());

      // Step 4: Move database to group if group name provided
      let groupResult;
      if (params.groupName) {
        groupResult = await this.client.moveDbintoNewDbGroup(dbId, params.groupName);
        if (!groupResult.success) {
          return {
            success: false,
            error: `Failed to move database to group: ${groupResult.error}`
          };
        }
      }

      // Step 5: Add vault entry for BC credentials
      const vaultEntry: VaultEntry = {
        name: params.vaultEntryName || "bc_credentials",
        // Set expiration to 1 year from now
        expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        credentials_type: "none",
        credentials: JSON.stringify({
          access_token: params.accessToken,
          store_hash: params.storeHash,
          client_id: params.clientId || "",
          channel_id: params.channelId || "",
        })
      };
      const vaultResult = await this.client.addDbVaultEntry(dbId, vaultEntry);
      if (!vaultResult.success) {
        return {
          success: false,
          error: `Failed to create vault entry: ${vaultResult.error}`
        };
      }
      const vaultId = vaultResult.data?.data?.new_row_id;

      // Step 6: Create import configuration
      const importConfig: ImportConfig = {
        file_location: "preprocess_script",
        join_type: "product_feed",
        name: "BC Product Import",
        tags: {
          platform: "Bigcommerce"
        },
        timeout: "1800",
        do_import: false,
        do_notify: false,
        notification_email: null,
        cron: "0 * * * *",
        url: "", // Will be set below
        preprocess_info: {
          actions: [],
          connection_info: {
            client: "bigcommerce",
            protocol: "api",
            access_token: params.accessToken,
            client_id: params.clientId || "",
            include: "products,category_tree",
            filters: {},
            price_list: {
              currencies: "",
              ids: ""
            },
            location_inventory: {
              ids: ""
            },
            store_hash: params.storeHash,
            store_url: params.storeUrl || `https://store-${params.storeHash}.mybigcommerce.com/`,
            show_empty_fields: "",
            additional_image_sizes: false,
            additional_options: "",
            additional_parent_fields: "",
            additional_variant_fields: "",
            to_columns: "",
            to_columns_keep_both: false
          },
          file_info: {
            request_type: "get",
            output_compressed: true
          }
        }
      };

      // Generate preprocessor URL
      importConfig.url = this.client.generateBigCommercePreprocessorUrl({
        connection_info: importConfig.preprocess_info!.connection_info,
        file_info: importConfig.preprocess_info!.file_info
      });

      const importResult = await this.client.createImport(importConfig);
      if (!importResult.success || !importResult.data?.id) {
        return {
          success: false,
          error: `Failed to create import: ${importResult.error}`
        };
      }
      const importId = importResult.data.id;

      // Step 7: Set up import schedule if provided
      if (params.importSchedule) {
        const schedule: Schedule = {
          day: params.importSchedule.day || "*",
          hour: params.importSchedule.hour || "*",
          minute: params.importSchedule.minute || "0",
        };
        const scheduleResult = await this.client.updateImportSchedule(importId, schedule);
        if (!scheduleResult.success) {
          return {
            success: false,
            error: `Failed to update import schedule: ${scheduleResult.error}`
          };
        }
      }

      // Step 8: Apply automated build template if specified
      if (params.buildTemplate) {
        const buildResult = await this.client.applyAutomateBuildTemplate(
          importId,
          params.buildTemplate
        );
        if (!buildResult.success) {
          return {
            success: false,
            error: `Failed to apply build template: ${buildResult.error}`
          };
        }
      }

      // Return success with all created resources
      return {
        success: true,
        data: {
          success: true,
          accountId,
          dbId,
          importId,
          vaultEntryId: vaultId,
          primaryUserEmail
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `BigCommerce setup failed: ${error.message}`
      };
    }
  }
} 