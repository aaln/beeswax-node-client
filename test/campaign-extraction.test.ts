import { BeeswaxClient } from '../src';

describe('Campaign 667 Extraction', () => {
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

  describe('Extract Campaign 667 with Line Items and Creatives', () => {
    test('should extract campaign 667 with all related data', async () => {
      // Skip if no real credentials
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping extraction test - no test credentials provided');
        return;
      }

      // 1. Authenticate
      await client.authenticate();

      // First, let's see what campaigns are available
      const availableCampaigns = await client.campaigns.query({ rows: 10 });
      console.log('\n=== AVAILABLE CAMPAIGNS ===');
      console.log('Total campaigns found:', availableCampaigns.payload?.length || 0);
      availableCampaigns.payload?.forEach(c => {
        console.log(`- Campaign ${c.campaign_id}: ${c.campaign_name}`);
      });

      // 2. Get campaign 667
      const campaignResponse = await client.campaigns.find(667);
      
      if (!campaignResponse.success || !campaignResponse.payload) {
        console.log('\nCampaign 667 not found.');
        console.log('Response:', campaignResponse);
        
        // If campaign 667 doesn't exist, try to extract the first available campaign
        if (availableCampaigns.payload && availableCampaigns.payload.length > 0) {
          const firstCampaign = availableCampaigns.payload[0];
          console.log(`\nInstead, extracting campaign ${firstCampaign.campaign_id}: ${firstCampaign.campaign_name}`);
          
          // Extract the first available campaign
          await extractCampaignData(client, firstCampaign.campaign_id);
        }
        return;
      }
      
      // Extract campaign 667
      await extractCampaignData(client, 667);
    });
  });
});

async function extractCampaignData(client: BeeswaxClient, campaignId: number) {
  // Get campaign details
  const campaignResponse = await client.campaigns.find(campaignId);
  
  if (!campaignResponse.success || !campaignResponse.payload) {
    console.log(`Campaign ${campaignId} not found`);
    return;
  }
  
  const campaign = campaignResponse.payload;
  console.log(`\n=== CAMPAIGN ${campaignId} ===`);
  console.log(JSON.stringify(campaign, null, 2));

  // 3. Get line items for campaign
  const lineItemsResponse = await client.lineItems.query({ 
    campaign_id: campaignId 
  });
  
  const lineItems = lineItemsResponse.payload || [];
  console.log(`\n=== LINE ITEMS (${lineItems.length} found) ===`);
  console.log(JSON.stringify(lineItems, null, 2));

  // 4. Get creatives associated with each line item
  const creativeLineItemMap = new Map<number, any[]>();
  const uniqueCreativeIds = new Set<number>();
  
  for (const lineItem of lineItems) {
    const cliResponse = await client.creativeLineItems.query({
      line_item_id: lineItem.line_item_id
    });
    
    if (cliResponse.success && cliResponse.payload) {
      creativeLineItemMap.set(lineItem.line_item_id, cliResponse.payload);
      
      // Collect unique creative IDs
      cliResponse.payload.forEach(cli => {
        uniqueCreativeIds.add(cli.creative_id);
      });
    }
  }
  
  console.log(`\n=== CREATIVE LINE ITEM ASSOCIATIONS ===`);
  creativeLineItemMap.forEach((clis, lineItemId) => {
    console.log(`Line Item ${lineItemId}:`, JSON.stringify(clis, null, 2));
  });

  // 5. Get creative details
  const creatives = [];
  for (const creativeId of uniqueCreativeIds) {
    const creativeResponse = await client.creatives.find(creativeId);
    
    if (creativeResponse.success && creativeResponse.payload) {
      creatives.push(creativeResponse.payload);
    }
  }
  
  console.log(`\n=== CREATIVES (${creatives.length} found) ===`);
  console.log(JSON.stringify(creatives, null, 2));

  // 6. Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Campaign: ${campaign.campaign_name} (ID: ${campaign.campaign_id})`);
  console.log(`Advertiser ID: ${campaign.advertiser_id}`);
  console.log(`Budget: ${campaign.campaign_budget} (Type: ${campaign.budget_type})`);
  console.log(`Dates: ${campaign.start_date} to ${campaign.end_date}`);
  console.log(`Active: ${campaign.active}`);
  console.log(`Total Line Items: ${lineItems.length}`);
  console.log(`Total Unique Creatives: ${creatives.length}`);
  
  // 7. Export full structure
  const fullCampaignData = {
    campaign,
    line_items: lineItems.map(li => ({
      ...li,
      creative_associations: creativeLineItemMap.get(li.line_item_id) || []
    })),
    creatives
  };
  
  console.log('\n=== FULL CAMPAIGN DATA STRUCTURE ===');
  console.log(JSON.stringify(fullCampaignData, null, 2));
  
  // Write to file for reference
  const fs = require('fs');
  const outputPath = `./campaign-${campaignId}-export.json`;
  fs.writeFileSync(outputPath, JSON.stringify(fullCampaignData, null, 2));
  console.log(`\nFull campaign data exported to: ${outputPath}`);
}