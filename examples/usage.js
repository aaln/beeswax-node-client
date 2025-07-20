const { BeeswaxClient } = require('../dist');

async function main() {
  // Initialize the client
  const client = new BeeswaxClient({
    apiRoot: process.env.BEESWAX_API_ROOT || 'https://example.api.beeswax.com',
    creds: {
      email: process.env.BEESWAX_EMAIL || 'user@example.com',
      password: process.env.BEESWAX_PASSWORD || 'password'
    }
  });

  try {
    // Example 1: Get current user info
    console.log('Getting current user info...');
    const userInfo = await client.getCurrentUser();
    console.log('Current user:', userInfo.payload);

    // Example 2: List all advertisers
    console.log('\nListing advertisers...');
    const advertisers = await client.advertisers.queryAll();
    console.log(`Found ${advertisers.payload.length} advertisers`);

    if (advertisers.payload.length > 0) {
      const advertiser = advertisers.payload[0];
      console.log('First advertiser:', advertiser);

      // Example 3: Create a campaign
      console.log('\nCreating a campaign...');
      const campaign = await client.campaigns.create({
        advertiser_id: advertiser.advertiser_id,
        campaign_name: `Test Campaign ${Date.now()}`,
        campaign_budget: 10000, // $100.00
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: true
      });
      console.log('Created campaign:', campaign.payload);

      // Example 4: Create a full campaign with macro
      console.log('\nCreating full campaign with macro...');
      const fullCampaign = await client.macros.createFullCampaign({
        advertiser_id: advertiser.advertiser_id,
        campaign_name: `Full Campaign ${Date.now()}`,
        campaign_budget: 50000, // $500.00
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_items: [
          {
            line_item_name: 'Display Desktop',
            line_item_budget: 25000, // $250.00
            bid_price: 250, // $2.50 CPM
            targeting: {
              geo: { country: ['US'] },
              device_type: ['desktop']
            },
            creatives: [
              {
                creative_name: 'Banner 728x90',
                creative_type: 'display',
                width: 728,
                height: 90
              }
            ]
          },
          {
            line_item_name: 'Display Mobile',
            line_item_budget: 25000, // $250.00
            bid_price: 200, // $2.00 CPM
            targeting: {
              geo: { country: ['US'] },
              device_type: ['mobile']
            },
            creatives: [
              {
                creative_name: 'Mobile Banner 320x50',
                creative_type: 'display',
                width: 320,
                height: 50
              }
            ]
          }
        ]
      });

      if (fullCampaign.success) {
        console.log('Created full campaign:', fullCampaign.payload.campaign);
        console.log('Line items created:', fullCampaign.payload.line_items.length);
        console.log('Creatives created:', fullCampaign.payload.creatives.length);
      }

      // Example 5: Query campaigns
      console.log('\nQuerying campaigns...');
      const campaigns = await client.campaigns.query({
        advertiser_id: advertiser.advertiser_id,
        active: true,
        rows: 10
      });
      console.log(`Found ${campaigns.payload.length} active campaigns`);

      // Example 6: Update campaign
      if (campaign.payload) {
        console.log('\nUpdating campaign...');
        const updated = await client.campaigns.edit(campaign.payload.campaign_id, {
          campaign_name: `${campaign.payload.campaign_name} - Updated`
        });
        console.log('Updated campaign:', updated.payload);
      }

      // Example 7: Clone campaign
      if (campaign.payload) {
        console.log('\nCloning campaign...');
        const cloned = await client.macros.cloneCampaign(
          campaign.payload.campaign_id,
          `${campaign.payload.campaign_name} - Clone`,
          {
            budget_multiplier: 1.5,
            clone_creatives: true
          }
        );
        console.log('Cloned campaign:', cloned.payload?.campaign);
      }

      // Example 8: Bulk operations
      if (campaigns.payload.length > 1) {
        console.log('\nPausing multiple campaigns...');
        const campaignIds = campaigns.payload.slice(0, 3).map(c => c.campaign_id);
        const bulkResult = await client.macros.bulkUpdateCampaignStatus(campaignIds, false);
        console.log(`Paused ${bulkResult.payload.updated} campaigns`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the examples
main().catch(console.error);