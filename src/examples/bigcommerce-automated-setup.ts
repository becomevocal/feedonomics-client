import { createFeedonomicsApi } from '../index';
import { BigCommerceSetupParams } from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse command line arguments
const isVerbose = process.argv.includes('--verbose');

// Check for required environment variables
const requiredEnvVars = [
  'FEEDONOMICS_API_TOKEN',
  'STORE_HASH', 
  'BC_ACCESS_TOKEN',
  'BC_CLIENT_ID',
  'CHANNEL_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Environment variable ${envVar} is required but not set.`);
    process.exit(1);
  }
}

// Initialize the service
const { service } = createFeedonomicsApi({
  apiToken: process.env.FEEDONOMICS_API_TOKEN!,
  verbose: isVerbose
});

async function setupBigCommerce() {
  // Prepare setup parameters
  const setupParams: BigCommerceSetupParams = {
    accountName: process.env.ACCOUNT_NAME || `BigCommerce Store - ${new Date().toISOString()}`,
    storeHash: process.env.STORE_HASH!,
    accessToken: process.env.BC_ACCESS_TOKEN!,
    clientId: process.env.BC_CLIENT_ID!,
    channelId: process.env.CHANNEL_ID!,
    userEmail: process.env.USER_EMAIL,
    storeUrl: process.env.STORE_URL || `https://store-${process.env.STORE_HASH}.mybigcommerce.com/`,
    dbName: process.env.DB_NAME || `BC Store ${process.env.STORE_HASH}`,
    groupName: process.env.GROUP_NAME || 'BigCommerce',
    vaultEntryName: process.env.VAULT_ENTRY_NAME || 'bc_credentials',
    importSchedule: {
      day: process.env.SCHEDULE_DAY || '*',
      hour: process.env.SCHEDULE_HOUR || '*',
      minute: process.env.SCHEDULE_MINUTE || '0'
    },
    buildTemplate: process.env.BUILD_TEMPLATE || ''
  };

  // Call the integrated setup method
  console.log('Starting BigCommerce integration setup...');

  console.log('Is a build template set?', setupParams.buildTemplate ? 'Yes' : 'No');
  
  const result = await service.setupBigCommerceIntegration(setupParams);
  
  if (!result.success) {
    console.error('❌ Setup failed:', result.error);
    process.exit(1);
  }

  // Display results
  console.log('✅ BigCommerce integration setup completed successfully!');
  console.log('Account ID:', result.data?.accountId);
  console.log('Database ID:', result.data?.dbId);
  console.log('Import ID:', result.data?.importId);
  console.log('Vault Entry ID:', result.data?.vaultEntryId);
  
  if (result.data?.primaryUserEmail) {
    console.log('Primary User:', result.data.primaryUserEmail);
  }
}

// Run the setup
setupBigCommerce().catch(error => {
  console.error('Unhandled error during setup:', error);
  process.exit(1);
}); 