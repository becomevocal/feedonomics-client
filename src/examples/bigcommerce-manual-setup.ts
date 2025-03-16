/**
 * BigCommerce Integration Setup Example
 *
 * This example demonstrates how to set up a complete BigCommerce integration:
 * 1. Authenticate as a BigCommerce user
 * 2. Create a new account
 * 3. Set up user permissions
 * 4. Create and configure a database
 * 5. Set up vault entries for BC credentials
 * 6. Configure imports and automated builds
 */

import * as dotenv from "dotenv";
import { createFeedonomicsApi } from "../index";
import { Schedule, VaultEntry, ImportConfig } from "../types";

// Load environment variables
dotenv.config();

// Parse command line arguments
const isVerbose = process.argv.includes("--verbose");

// Check for required environment variables
const requiredEnvVars = [
  "FEEDONOMICS_API_TOKEN",
  "BC_ACCESS_TOKEN",
  "STORE_HASH",
  "CHANNEL_ID",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Error: ${envVar} is required in .env file`);
    process.exit(1);
  }
}

async function setupBigCommerceIntegration() {
  console.log("🚀 Setting up BigCommerce integration...\n");

  // Initialize the Feedonomics API client with proper configuration
  const apiToken = process.env.FEEDONOMICS_API_TOKEN;
  if (!apiToken && !process.env.FEEDONOMICS_USERNAME) {
    throw new Error("Either FEEDONOMICS_API_TOKEN or FEEDONOMICS_USERNAME must be set");
  }

  const { client } = createFeedonomicsApi({
    apiToken: apiToken || "",
    verbose: isVerbose,
  });

  try {
    // Step 1: Generate authentication token only if API token is not set
    if (!apiToken) {
      console.log("1️⃣ Authenticating user...");
      const loginResult = await client.login(
        process.env.FEEDONOMICS_USERNAME || "",
        process.env.FEEDONOMICS_PASSWORD || "",
        process.env.FEEDONOMICS_NAME || ""
      );
      if (!loginResult.success) {
        throw new Error(`Authentication failed: ${loginResult.error}`);
      }
      console.log("✅ Authentication successful\n");
    } else {
      console.log("1️⃣ Using API token for authentication\n");
    }

    // Step 2: Create BigCommerce account
    console.log("2️⃣ Creating BigCommerce account...");
    const accountResult = await client.createBigCommerceAccount(
      `API Client Test ${process.env.STORE_HASH} ${new Date().toISOString()}`
    );
    if (!accountResult.success || !accountResult.data?.id) {
      throw new Error(`Failed to create account: ${accountResult.error}`);
    }
    const accountId = accountResult.data.id;
    console.log(`✅ Account created (ID: ${accountId})\n`);

    // Step 3: Invite primary user
    console.log("3️⃣ Setting up user permissions...");
    const email = process.env.BC_USER_EMAIL || "user@example.com";
    const inviteResult = await client.invitePrimaryUser(accountId, email);
    if (!inviteResult.success) {
      throw new Error(`Failed to invite user: ${inviteResult.error}`);
    }
    console.log(`✅ Invited ${email} as primary user\n`);

    // Step 4: Create database
    const dbName = `BC Store ${process.env.STORE_HASH}`;
    console.log(`4️⃣ Creating '${dbName}' database...`);
    const dbResult = await client.createDb(
      accountId,
      dbName
    );
    if (!dbResult.success || !dbResult.data?.id) {
      throw new Error(`Failed to create database: ${dbResult.error}`);
    }
    const dbId = dbResult.data.id;
    client.setDbId(dbId.toString());
    console.log(`✅ Database created (ID: ${dbId})\n`);

    // Step 5: Move database to group
    const groupName = "API Client Test Group";
    console.log(`5️⃣ Moving database into '${groupName}' group...`);
    const groupResult = await client.moveDbintoNewDbGroup(
      dbId,
      groupName
    );
    if (!groupResult.success) {
      throw new Error(`Failed to move database to group: ${groupResult.error}`);
    }
    console.log("✅ Database moved to group\n");

    // Step 6: Add vault entry for BC credentials
    console.log("6️⃣ Setting up credentials vault...");
    const vaultEntry: VaultEntry = {
      name: process.env.VAULT_ENTRY_NAME || "bc_credentials",
      // Set expiration to 1 year from now
      expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      credentials_type: "none",
      credentials: JSON.stringify({
        access_token: process.env.BC_ACCESS_TOKEN || "",
        store_hash: process.env.STORE_HASH || "",
        channel_id: process.env.CHANNEL_ID || "",
        client_id: process.env.BC_CLIENT_ID || "",
      })
    };
    const vaultResult = await client.addDbVaultEntry(dbId, vaultEntry);
    if (!vaultResult.success) {
      throw new Error(`Failed to create vault entry: ${vaultResult.error}`);
    }
    
    const vaultId = vaultResult.data?.data?.new_row_id;
    console.log(`✅ BC credentials stored in vault (new_row_id: ${vaultId})\n`);

    // Step 7: Create import configuration
    console.log("7️⃣ Setting up product import...");
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
      url: "", // Initialize empty URL that will be set below
      preprocess_info: {
        actions: [],
        connection_info: {
          client: "bigcommerce",
          protocol: "api",
          access_token: process.env.BC_ACCESS_TOKEN || "",
          client_id: process.env.BC_CLIENT_ID || "",
          include: "products,category_tree",
          filters: {},
          price_list: {
            currencies: "",
            ids: ""
          },
          location_inventory: {
            ids: ""
          },
          store_hash: process.env.STORE_HASH || "",
          store_url: `https://store-${process.env.STORE_HASH}.mybigcommerce.com/`,
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
    importConfig.url = client.generateBigCommercePreprocessorUrl({
      connection_info: importConfig.preprocess_info!.connection_info,
      file_info: importConfig.preprocess_info!.file_info
    });

    const importResult = await client.createImport(importConfig);
    if (!importResult.success || !importResult.data?.id) {
      throw new Error(`Failed to create import: ${importResult.error}`);
    }
    const importId = importResult.data.id;
    console.log(`✅ Import configuration created (ID: ${importId})\n`);

    // Step 8: Set up import schedule
    console.log("8️⃣ Configuring import schedule...");
    const schedule: Schedule = {
      day: "*", // Every day
      hour: "*", // Every hour
      minute: "0", // On the hour
    };
    const scheduleResult = await client.updateImportSchedule(importId, schedule);
    if (!scheduleResult.success) {
      throw new Error(`Failed to update import schedule: ${scheduleResult.error}`);
    }
    console.log(`✅ Import schedule configured (importId: ${importId})\n`);

    // Step 9: Apply automated build template
    console.log("9️⃣ Setting up automated feed build...");
    const buildResult = await client.applyAutomateBuildTemplate(
      importId,
      "bigcommerce_products"
    );
    if (!buildResult.success) {
      throw new Error(`Failed to apply build template: ${buildResult.error}`);
    }
    console.log("✅ Automated build template applied\n");

    console.log("🎉 BigCommerce integration setup complete!");
    console.log("\nSetup Summary:");
    console.log("-------------");
    console.log(`Account ID: ${accountId}`);
    console.log(`Database ID: ${dbId}`);
    console.log(`Import ID: ${importId}`);
    console.log(`Primary User: ${email}`);
    console.log(`Schedule: Every 4 hours`);
    console.log("\nNext Steps:");
    console.log("1. Check your email for the user invitation");
    console.log("2. Monitor the first import run");
    console.log("3. Review the automated build configuration");
  } catch (error: any) {
    console.error("\n❌ Setup failed!");
    console.error("Error Details:");
    console.error("-------------");
    console.error(`🔸 Message: ${error.message}`);
    process.exit(1);
  }
}

// Run the setup
setupBigCommerceIntegration();
