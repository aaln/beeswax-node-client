import { BeeswaxClient } from '../src';

describe('Integration Tests', () => {
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

  describe('End-to-End Campaign Workflow', () => {
    test('should complete full campaign lifecycle', async () => {
      // Skip if no real credentials
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        console.log('Skipping integration test - no test credentials provided');
        return;
      }

      // 1. Authenticate
      await client.authenticate();

      // 2. Get advertiser
      const advertisers = await client.advertisers.query({ rows: 1 });
      expect(advertisers.success).toBe(true);
      expect(advertisers.payload?.length).toBeGreaterThan(0);
      
      const advertiserId = advertisers.payload![0].advertiser_id;

      // 3. Create campaign
      const campaign = await client.campaigns.create({
        advertiser_id: advertiserId,
        campaign_name: `Integration Test ${Date.now()}`,
        campaign_budget: 5000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: false
      });
      
      expect(campaign.success).toBe(true);
      const campaignId = campaign.payload!.campaign_id;

      // 4. Create line item
      const lineItem = await client.createLineItem({
        campaign_id: campaignId,
        line_item_name: 'Integration Test Line Item',
        line_item_budget: 1000,
        cpm_bid: 2.50,
        active: false
      });
      
      expect(lineItem.success).toBe(true);
      const lineItemId = lineItem.payload!.line_item_id;

      // 5. Create creative
      const creative = await client.creatives.create({
        advertiser_id: advertiserId,
        creative_name: 'Integration Test Creative',
        creative_type: 0,
        creative_template_id: 1,
        width: 300,
        height: 250,
        click_url: 'https://example.com',
        secure: true,
        active: false
      });
      
      expect(creative.success).toBe(true);
      const creativeId = creative.payload!.creative_id;

      // 6. Associate creative with line item
      const cli = await client.creativeLineItems.create({
        creative_id: creativeId,
        line_item_id: lineItemId,
        active: false,
        weighting: 100
      });
      
      expect(cli.success).toBe(true);

      // 7. Query to verify
      const lineItems = await client.lineItems.query({ campaign_id: campaignId });
      expect(lineItems.payload?.length).toBe(1);

      // 8. Clean up
      await client.creativeLineItems.delete(cli.payload!.cli_id);
      await client.lineItems.delete(lineItemId);
      await client.campaigns.delete(campaignId);
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication failure', async () => {
      const badClient = new BeeswaxClient({
        apiRoot: process.env.BEESWAX_API_ROOT || 'https://example.api.beeswax.com',
        creds: {
          email: 'invalid@example.com',
          password: 'wrong_password'
        }
      });

      await expect(badClient.authenticate()).rejects.toThrow();
    });

    test('should handle invalid campaign creation', async () => {
      // Skip if no real credentials
      if (!process.env.BEESWAX_TEST_EMAIL || !process.env.BEESWAX_TEST_PASSWORD) {
        return;
      }

      await client.authenticate();
      
      const result = await client.campaigns.create({
        advertiser_id: 999999, // Non-existent advertiser
        campaign_name: 'Invalid Campaign',
        campaign_budget: 5000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: false
      });

      expect(result.success).toBe(false);
    });
  });
});