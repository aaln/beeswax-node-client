import { BeeswaxClient } from '../src';
import { CreativeType } from '../src/types';

// Test credentials - these should be replaced with test account credentials
const TEST_CREDENTIALS = {
  email: process.env.BEESWAX_TEST_EMAIL || 'test@example.com',
  password: process.env.BEESWAX_TEST_PASSWORD || 'test_password'
};

describe('BeeswaxClient', () => {
  let client: BeeswaxClient;
  let testAdvertiserId: number;
  let testCampaignId: number;
  let testLineItemId: number;
  let testCreativeId: number;

  beforeAll(async () => {
    // Skip all tests if no real API root or credentials are provided
    const hasRealApiRoot = process.env.BEESWAX_API_ROOT && !process.env.BEESWAX_API_ROOT.includes('example');
    const hasRealCredentials = process.env.BEESWAX_TEST_EMAIL && process.env.BEESWAX_TEST_PASSWORD;
    
    if (!hasRealApiRoot || !hasRealCredentials) {
      console.log('Skipping BeeswaxClient tests - no real API root or test credentials provided');
      return;
    }

    client = new BeeswaxClient({
      apiRoot: process.env.BEESWAX_API_ROOT || 'https://example.api.beeswax.com',
      creds: TEST_CREDENTIALS,
      retryOptions: {
        retries: 3
      }
    });

    // Authenticate once for all tests
    await client.authenticate();

    // Get a test advertiser
    const advertisers = await client.advertisers.query({ rows: 1 });
    if (advertisers.payload && advertisers.payload.length > 0) {
      testAdvertiserId = advertisers.payload[0].advertiser_id;
    }
  });

  afterAll(async () => {
    // Clean up any test data created
    if (testCampaignId) {
      try {
        // Delete line items first
        const lineItems = await client.lineItems.query({ campaign_id: testCampaignId });
        for (const li of lineItems.payload || []) {
          // Delete creative associations
          const clis = await client.creativeLineItems.query({ line_item_id: li.line_item_id });
          for (const cli of clis.payload || []) {
            await client.creativeLineItems.delete(cli.cli_id);
          }
          await client.lineItems.delete(li.line_item_id);
        }
        await client.campaigns.delete(testCampaignId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  });

  describe('Authentication', () => {
    test('should authenticate successfully', async () => {
      if (!client) return; // Skip if no client
      const result = await client.authenticate();
      expect(result).toBeUndefined(); // authenticate returns void on success
    });
  });

  describe('Campaigns', () => {
    test('should create a campaign', async () => {
      if (!client || !testAdvertiserId) return; // Skip if no client or advertiser
      const campaign = await client.campaigns.create({
        advertiser_id: testAdvertiserId,
        campaign_name: `Jest Test Campaign ${Date.now()}`,
        campaign_budget: 5000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        active: false
      });

      expect(campaign.success).toBe(true);
      expect(campaign.payload).toBeDefined();
      expect(campaign.payload?.campaign_id).toBeDefined();
      
      testCampaignId = campaign.payload!.campaign_id;
    });

    test('should query campaigns', async () => {
      if (!client || !testAdvertiserId) return; // Skip if no client or advertiser
      const campaigns = await client.campaigns.query({
        advertiser_id: testAdvertiserId,
        rows: 5
      });

      expect(campaigns.success).toBe(true);
      expect(campaigns.payload).toBeInstanceOf(Array);
    });

    test('should update a campaign', async () => {
      if (!client || !testCampaignId) return; // Skip if no client or campaign
      const updated = await client.campaigns.edit(testCampaignId, {
        campaign_name: `Updated Jest Campaign ${Date.now()}`
      });

      expect(updated.success).toBe(true);
      expect(updated.payload?.campaign_name).toContain('Updated Jest Campaign');
    });
  });

  describe('Line Items', () => {
    test('should create a line item using helper', async () => {
      if (!client || !testCampaignId) return; // Skip if no client or campaign
      const lineItem = await client.createLineItem({
        campaign_id: testCampaignId,
        line_item_name: `Jest Line Item ${Date.now()}`,
        line_item_budget: 1000,
        cpm_bid: 2.50,
        active: false
      });

      expect(lineItem.success).toBe(true);
      expect(lineItem.payload).toBeDefined();
      expect(lineItem.payload?.line_item_id).toBeDefined();
      
      testLineItemId = lineItem.payload!.line_item_id;
    });

    test('should query line items', async () => {
      if (!client || !testCampaignId) return; // Skip if no client or campaign
      const lineItems = await client.lineItems.query({
        campaign_id: testCampaignId
      });

      expect(lineItems.success).toBe(true);
      expect(lineItems.payload).toBeInstanceOf(Array);
      expect(lineItems.payload?.length).toBeGreaterThan(0);
    });
  });

  describe('Creatives', () => {
    test('should create a creative', async () => {
      if (!client || !testAdvertiserId) return; // Skip if no client or advertiser
      const creative = await client.creatives.create({
        advertiser_id: testAdvertiserId,
        creative_name: `Jest Creative ${Date.now()}`,
        creative_type: CreativeType.DISPLAY,
        creative_template_id: 1,
        width: 300,
        height: 250,
        click_url: 'https://example.com',
        secure: true,
        active: false
      });

      expect(creative.success).toBe(true);
      expect(creative.payload).toBeDefined();
      expect(creative.payload?.creative_id).toBeDefined();
      
      testCreativeId = creative.payload!.creative_id;
    });

    test('should query creatives', async () => {
      if (!client || !testAdvertiserId) return; // Skip if no client or advertiser
      const creatives = await client.creatives.query({
        advertiser_id: testAdvertiserId,
        rows: 5
      });

      expect(creatives.success).toBe(true);
      expect(creatives.payload).toBeInstanceOf(Array);
    });
  });

  describe('Creative Line Item Associations', () => {
    test('should associate creative with line item', async () => {
      if (!client || !testCreativeId || !testLineItemId) return; // Skip if no client or IDs
      const cli = await client.creativeLineItems.create({
        creative_id: testCreativeId,
        line_item_id: testLineItemId,
        active: false,
        weighting: 100
      });

      expect(cli.success).toBe(true);
      expect(cli.payload).toBeDefined();
      expect(cli.payload?.cli_id).toBeDefined();
    });
  });

  describe('Campaign Macros', () => {
    test('should create a full campaign', async () => {
      if (!client || !testAdvertiserId) return; // Skip if no client or advertiser
      const fullCampaign = await client.macros.createFullCampaign({
        advertiser_id: testAdvertiserId,
        campaign_name: `Jest Macro Campaign ${Date.now()}`,
        campaign_budget: 10000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_items: [{
          line_item_name: 'Jest Macro Line Item',
          line_item_budget: 5000,
          bid_price: 3.00,
          creatives: [{
            creative_name: 'Jest Macro Banner',
            creative_type: 'display',
            width: 728,
            height: 90
          }]
        }]
      });

      expect(fullCampaign.success).toBe(true);
      expect(fullCampaign.payload?.campaign).toBeDefined();
      expect(fullCampaign.payload?.line_items.length).toBe(1);
      expect(fullCampaign.payload?.creatives.length).toBe(1);

      // Clean up
      if (fullCampaign.payload?.campaign.campaign_id) {
        const campaignId = fullCampaign.payload.campaign.campaign_id;
        const lineItems = await client.lineItems.query({ campaign_id: campaignId });
        
        for (const li of lineItems.payload || []) {
          const clis = await client.creativeLineItems.query({ line_item_id: li.line_item_id });
          for (const cli of clis.payload || []) {
            await client.creativeLineItems.delete(cli.cli_id);
          }
          await client.lineItems.delete(li.line_item_id);
        }
        
        await client.campaigns.delete(campaignId);
      }
    });

    test('should bulk create line items', async () => {
      if (!client || !testCampaignId) return; // Skip if no client or campaign
      const result = await client.macros.bulkCreateLineItems(
        testCampaignId,
        [
          { name: 'Bulk Line Item 1', budget: 500, bid_price: 2.00 },
          { name: 'Bulk Line Item 2', budget: 750, bid_price: 2.50 }
        ]
      );

      expect(result.success).toBe(true);
      expect(result.payload?.length).toBe(2);
    });
  });
});