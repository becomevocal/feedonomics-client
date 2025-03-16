// Feedonomics API types

// Common response interface
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// Client configuration
export interface FeedonomicsConfig {
  apiToken: string;
  dbId?: string;
  importUrl: string;
  vaultEntryName: string;
  timeout?: number;
  baseUrl?: string;
  verbose?: boolean;
}

// Account types
export interface Account {
  id: string | number;
  account_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  id: string | number;
  name: string;
  account_id: string | number;
  status?: string;
}

// Vault entry
export interface VaultEntry {
  id?: string | number;
  name: string;
  expiration: string;
  credentials_type: "none";
  credentials: string;
}

// Import types
export interface ImportConfig {
  file_location?: string;
  join_type?: string;
  name: string;
  tags?: {
    platform?: string;
    [key: string]: string | undefined;
  };
  timeout?: string;
  do_import?: boolean;
  do_notify?: boolean;
  notification_email?: string | null;
  cron?: string;
  additional_options?: string;
  url?: string;
  preprocess_info?: {
    actions?: any[];
    connection_info: ConnectionInfo;
    file_info?: {
      request_type?: string;
      output_compressed?: boolean;
    };
  };
}

export interface ConnectionInfo {
  client?: string;
  protocol?: string;
  access_token: string;
  client_id: string | number;
  store_hash: string;
  store_url: string;
  channel_ids?: number[] | number;
  filters?: Record<string, any>;
  include?: string;
  additional_parent_fields?: string;
  additional_variant_fields?: string;
  pull_sample?: number;
  price_list?: {
    currencies: string;
    ids: string;
  };
  location_inventory?: {
    ids: string;
  };
  show_empty_fields?: string;
  additional_image_sizes?: boolean;
  additional_options?: string;
  to_columns?: string;
  to_columns_keep_both?: boolean;
  [key: string]: any;
}

// Transformer types
export interface Transformer {
  enabled: boolean;
  field_name: string;
  selector: string;
  transformer: string;
  export_id: number[];
}

// Join import types
export interface JoinImportConfig {
  name: string;
  file_name: string;
  host: string;
  username: string;
  password: string;
}

// Export types
export interface ExportConfig {
  name: string;
  file_name: string;
  protocol: string;
  host: string;
  username: string;
  password: string;
  export_fields: ExportField[];
  export_selector?: string;
  tags?: Tag[];
}

export interface ExportField {
  field_name: string;
  export_field_name: string;
  required: string;
}

export interface Tag {
  tag: string;
  value: string;
}

// Schedule types
export interface Schedule {
  day: string;
  hour: string;
  minute: string;
}

// FTP types
export interface FtpCredentials {
  host: string;
  username: string;
  password: string;
}

// Group types
export interface Group {
  id: string | number;
  name: string;
  account_id: string | number;
}

export interface GroupMovePayload {
  db_id: string | number;
  group_id: string | number;
  group_name: string;
}

// BigCommerce Setup types
export interface BigCommerceSetupParams {
  accountName: string;
  storeHash: string;
  storeUrl?: string;
  accessToken: string;
  storeId?: string;
  clientId?: string;
  channelId: string | number;
  userEmail?: string;
  vaultEntryName?: string;
  dbName?: string;
  groupName?: string;
  importSchedule?: {
    day: string;
    hour: string;
    minute: string;
  };
  buildTemplate?: string;
}

export interface BigCommerceSetupResult {
  success: boolean;
  error?: string;
  accountId?: string | number;
  dbId?: string | number;
  importId?: string | number;
  vaultEntryId?: string | number;
  primaryUserEmail?: string;
} 