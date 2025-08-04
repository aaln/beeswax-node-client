import { BeeswaxClient } from '../src';

describe('Load Line Items and Creatives', () => {
  let client: BeeswaxClient;
  
  beforeAll(() => {
    client = new BeeswaxClient({
      apiRoot: process.env.BEESWAX_API_ROOT || 'https://example.api.beeswax.com',
      creds: {
        email: process.env.BEESWAX_TEST_EMAIL || 'test@example.com',
        password: process.env.BEESWAX_TEST_PASSWORD || 'test_password'
      }
    });
  });

  describe('Load Line Items', () => {
    test('should load all line items for an advertiser', async () => {
      // Skip if no real credentials
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping test - no test credentials provided');
        return;
      }

      // Authenticate
      await client.authenticate();

      // Get first advertiser
      const advertisersResponse = await client.advertisers.query({ rows: 1 });
      if (!advertisersResponse.success || !advertisersResponse.payload?.length) {
        console.log('No advertisers found');
        return;
      }

      const advertiserId = advertisersResponse.payload[0].advertiser_id;
      console.log(`\n=== Loading line items for advertiser ${advertiserId} ===`);

      // Load all line items for the advertiser
      const lineItemsResponse = await client.lineItems.query({
        advertiser_id: advertiserId,
        rows: 50 // Get up to 50 line items
      });

      expect(lineItemsResponse.success).toBe(true);
      const lineItems = lineItemsResponse.payload || [];
      
      console.log(`\nFound ${lineItems.length} line items`);
      
      // Group by campaign
      const lineItemsByCampaign = lineItems.reduce((acc, li) => {
        if (!acc[li.campaign_id]) {
          acc[li.campaign_id] = [];
        }
        acc[li.campaign_id].push(li);
        return acc;
      }, {} as Record<number, typeof lineItems>);

      console.log('\n=== Line Items by Campaign ===');
      for (const [campaignId, items] of Object.entries(lineItemsByCampaign)) {
        console.log(`\nCampaign ${campaignId}:`);
        items.forEach(li => {
          console.log(`  - ${li.line_item_id}: ${li.line_item_name}`);
          console.log(`    Budget: $${((li.line_item_budget || 0) / 100).toFixed(2)}`);
          console.log(`    CPM Bid: $${(li.bidding?.values?.cpm_bid || 0).toFixed(2)}`);
          console.log(`    Active: ${li.active}`);
        });
      }
    });

    test('should load line items with specific filters', async () => {
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping test - no test credentials provided');
        return;
      }

      await client.authenticate();

      // Load only active line items
      console.log('\n=== Loading active line items ===');
      const activeLineItems = await client.lineItems.query({
        active: true,
        rows: 10
      });

      console.log(`Found ${activeLineItems.payload?.length || 0} active line items`);

      // Load line items with budget > $10
      console.log('\n=== Loading line items with budget > $10 ===');
      const allLineItems = await client.lineItems.query({ rows: 100 });
      
      if (allLineItems.payload) {
        const highBudgetLineItems = allLineItems.payload.filter(
          li => (li.line_item_budget || 0) > 1000 // $10 in cents
        );
        
        console.log(`Found ${highBudgetLineItems.length} line items with budget > $10`);
        highBudgetLineItems.slice(0, 5).forEach(li => {
          console.log(`  - ${li.line_item_name}: $${((li.line_item_budget || 0) / 100).toFixed(2)}`);
        });
      }
    });
  });

  describe('Load Creatives', () => {
    test('should load all creatives for an advertiser', async () => {
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping test - no test credentials provided');
        return;
      }

      await client.authenticate();

      // Get first advertiser
      const advertisersResponse = await client.advertisers.query({ rows: 1 });
      if (!advertisersResponse.success || !advertisersResponse.payload?.length) {
        console.log('No advertisers found');
        return;
      }

      const advertiserId = advertisersResponse.payload[0].advertiser_id;
      console.log(`\n=== Loading creatives for advertiser ${advertiserId} ===`);

      // Load all creatives
      const creativesResponse = await client.creatives.query({
        advertiser_id: advertiserId,
        rows: 50
      });

      expect(creativesResponse.success).toBe(true);
      const creatives = creativesResponse.payload || [];
      
      console.log(`\nFound ${creatives.length} creatives`);
      
      // Group by creative type
      const creativesByType = creatives.reduce((acc, c) => {
        const type = c.creative_type === 0 ? 'Display' : 
                    c.creative_type === 1 ? 'Video' : 
                    c.creative_type === 2 ? 'Native' : 'Other';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(c);
        return acc;
      }, {} as Record<string, typeof creatives>);

      console.log('\n=== Creatives by Type ===');
      for (const [type, items] of Object.entries(creativesByType)) {
        console.log(`\n${type} (${items.length}):`);
        items.slice(0, 5).forEach(c => {
          console.log(`  - ${c.creative_id}: ${c.creative_name}`);
          console.log(`    Size: ${c.width}x${c.height}`);
          console.log(`    Click URL: ${c.click_url}`);
          console.log(`    Active: ${c.active}`);
        });
      }
    });

    test('should load creative details with assets', async () => {
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping test - no test credentials provided');
        return;
      }

      await client.authenticate();

      // Get a creative with assets
      const creativesResponse = await client.creatives.query({ rows: 5 });
      if (!creativesResponse.success || !creativesResponse.payload?.length) {
        console.log('No creatives found');
        return;
      }

      const creative = creativesResponse.payload[0];
      console.log(`\n=== Creative Details: ${creative.creative_name} ===`);
      console.log(JSON.stringify(creative, null, 2));

      // If creative has primary asset, load asset details
      if (creative.primary_asset) {
        console.log(`\n=== Loading asset ${creative.primary_asset} ===`);
        const assetResponse = await client.creativeAssets.find(creative.primary_asset);
        
        if (assetResponse.success && assetResponse.payload) {
          console.log('Asset details:');
          console.log(JSON.stringify(assetResponse.payload, null, 2));
        }
      }
    });
  });

  describe('Load Line Item and Creative Associations', () => {
    test('should load creatives associated with line items', async () => {
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping test - no test credentials provided');
        return;
      }

      await client.authenticate();

      // Get line items
      const lineItemsResponse = await client.lineItems.query({ rows: 10 });
      if (!lineItemsResponse.success || !lineItemsResponse.payload?.length) {
        console.log('No line items found');
        return;
      }

      console.log('\n=== Line Item Creative Associations ===');
      
      for (const lineItem of lineItemsResponse.payload.slice(0, 5)) {
        console.log(`\nLine Item: ${lineItem.line_item_name} (${lineItem.line_item_id})`);
        
        // Get creative associations
        const cliResponse = await client.creativeLineItems.query({
          line_item_id: lineItem.line_item_id
        });
        
        if (cliResponse.success && cliResponse.payload?.length) {
          console.log(`  Associated creatives (${cliResponse.payload.length}):`);
          
          for (const cli of cliResponse.payload) {
            // Get creative details
            const creativeResponse = await client.creatives.find(cli.creative_id);
            if (creativeResponse.success && creativeResponse.payload) {
              const creative = creativeResponse.payload;
              console.log(`    - Creative ${creative.creative_id}: ${creative.creative_name}`);
              console.log(`      Weight: ${cli.weighting}`);
              console.log(`      Active: ${cli.active}`);
            }
          }
        } else {
          console.log('  No associated creatives');
        }
      }
    });
  });

  describe('Bulk Operations', () => {
    test('should demonstrate bulk loading with pagination', async () => {
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping test - no test credentials provided');
        return;
      }

      await client.authenticate();

      console.log('\n=== Bulk Loading with Pagination ===');
      
      // Load line items in batches
      const batchSize = 10;
      let offset = 0;
      let totalLineItems = 0;
      const allLineItems = [];

      while (true) {
        const response = await client.lineItems.query({
          rows: batchSize,
          offset: offset
        });

        if (!response.success || !response.payload?.length) {
          break;
        }

        allLineItems.push(...response.payload);
        totalLineItems += response.payload.length;
        
        console.log(`Loaded batch ${offset / batchSize + 1}: ${response.payload.length} items`);
        
        if (response.payload.length < batchSize) {
          break; // Last batch
        }
        
        offset += batchSize;
        
        // Stop after 3 batches for demo
        if (offset >= batchSize * 3) {
          console.log('(Stopping after 3 batches for demo)');
          break;
        }
      }

      console.log(`\nTotal line items loaded: ${totalLineItems}`);
      
      // Show summary statistics
      const stats = {
        totalBudget: allLineItems.reduce((sum, li) => sum + (li.line_item_budget || 0), 0),
        activeCount: allLineItems.filter(li => li.active).length,
        avgCpmBid: allLineItems.reduce((sum, li) => 
          sum + (li.bidding?.values?.cpm_bid || 0), 0) / allLineItems.length
      };

      console.log('\n=== Statistics ===');
      console.log(`Total Budget: $${(stats.totalBudget / 100).toFixed(2)}`);
      console.log(`Active Line Items: ${stats.activeCount}/${totalLineItems}`);
      console.log(`Average CPM Bid: $${stats.avgCpmBid.toFixed(2)}`);
    });
  });
});