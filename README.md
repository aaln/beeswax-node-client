# Beeswax Client

A TypeScript/JavaScript client library for the Beeswax DSP API.

## Features

- 🚀 Full TypeScript support with comprehensive type definitions
- 🔄 Automatic retry logic with exponential backoff
- 🔐 Session-based authentication with automatic renewal
- 📦 Resource-based architecture for clean API interactions
- 🛠️ Helper methods and macros for complex operations
- ✨ Support for all major Beeswax entities (Campaigns, Line Items, Creatives, etc.)

## Installation

```bash
npm install beeswax-node-client
```

or

```bash
yarn add beeswax-node-client
```

## Quick Start

```typescript
import { BeeswaxClient } from 'beeswax-node-client';

// Initialize the client
const client = new BeeswaxClient({
  apiRoot: 'https://example.api.beeswax.com', // Required - your Beeswax API endpoint
  creds: {
    email: 'your-email@example.com',
    password: 'your-password'
  }
});

// Authenticate
await client.authenticate();

// Get advertisers
const advertisers = await client.advertisers.query({ rows: 10 });
console.log(advertisers.payload);

// Create a campaign
const campaign = await client.campaigns.create({
  advertiser_id: 123,
  campaign_name: 'My Campaign',
  campaign_budget: 10000, // $100.00 in cents
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  active: false
});
```

## Core Resources

### Campaigns

```typescript
// Create a campaign
const campaign = await client.campaigns.create({
  advertiser_id: 123,
  campaign_name: 'Q1 Campaign',
  campaign_budget: 50000, // $500.00
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  active: false
});

// Query campaigns
const campaigns = await client.campaigns.query({
  advertiser_id: 123,
  active: true,
  rows: 20
});

// Update a campaign
const updated = await client.campaigns.edit(campaignId, {
  campaign_name: 'Updated Campaign Name',
  campaign_budget: 75000
});

// Delete a campaign
const deleted = await client.campaigns.delete(campaignId);
```

### Line Items

```typescript
// Create a line item using the helper method
const lineItem = await client.createLineItem({
  campaign_id: 456,
  line_item_name: 'Display Line Item',
  line_item_budget: 10000, // $100.00
  cpm_bid: 2.50, // $2.50 CPM
  active: false
});

// Query line items
const lineItems = await client.lineItems.query({
  campaign_id: 456,
  active: true
});
```

### Creatives

```typescript
// Create a creative
const creative = await client.creatives.create({
  advertiser_id: 123,
  creative_name: 'Banner 300x250',
  creative_type: 0, // 0=Display, 1=Video, 2=Native
  creative_template_id: 1,
  width: 300,
  height: 250,
  click_url: 'https://example.com',
  secure: true,
  active: false
});

// Associate creative with line item
const association = await client.creativeLineItems.create({
  creative_id: creative.payload.creative_id,
  line_item_id: lineItem.payload.line_item_id,
  active: false,
  weighting: 100
});
```

## Macros (Advanced Operations)

### Create Full Campaign

Create a complete campaign with line items and creatives in one operation:

```typescript
const fullCampaign = await client.macros.createFullCampaign({
  advertiser_id: 123,
  campaign_name: 'Full Campaign',
  campaign_budget: 100000, // $1,000.00
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  line_items: [{
    line_item_name: 'Display Desktop',
    line_item_budget: 50000,
    bid_price: 3.00, // $3.00 CPM
    creatives: [{
      creative_name: 'Banner 728x90',
      creative_type: 'display',
      width: 728,
      height: 90
    }]
  }, {
    line_item_name: 'Display Mobile',
    line_item_budget: 50000,
    bid_price: 2.50,
    creatives: [{
      creative_name: 'Mobile Banner 320x50',
      creative_type: 'display',
      width: 320,
      height: 50
    }]
  }]
});
```

### Clone Campaign

```typescript
const cloned = await client.macros.cloneCampaign(
  originalCampaignId,
  'Cloned Campaign Name',
  {
    start_date: '2024-04-01',
    end_date: '2024-06-30',
    budget_multiplier: 1.5, // Increase budget by 50%
    clone_creatives: true
  }
);
```

### Bulk Operations

```typescript
// Bulk create line items
const lineItems = await client.macros.bulkCreateLineItems(campaignId, [
  { name: 'Line Item 1', budget: 5000, bid_price: 2.50 },
  { name: 'Line Item 2', budget: 7500, bid_price: 3.00 },
  { name: 'Line Item 3', budget: 10000, bid_price: 3.50 }
]);

// Bulk update campaign status
const result = await client.macros.bulkUpdateCampaignStatus(
  [campaignId1, campaignId2, campaignId3],
  false // Pause campaigns
);
```

## Configuration Options

```typescript
const client = new BeeswaxClient({
  apiRoot: 'https://example.api.beeswax.com', // Required - your Beeswax API endpoint
  creds: {
    email: 'your-email@example.com',
    password: 'your-password'
  },
  timeout: 30000, // Request timeout in milliseconds
  retryOptions: {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000, // Custom retry delay
    retryCondition: (error) => error.response?.status >= 500 // Retry on 5xx errors
  }
});
```

## Error Handling

```typescript
try {
  const campaign = await client.campaigns.create({
    advertiser_id: 123,
    campaign_name: 'My Campaign',
    campaign_budget: 10000,
    start_date: '2024-01-01',
    end_date: '2024-12-31'
  });
  
  if (campaign.success) {
    console.log('Campaign created:', campaign.payload);
  } else {
    console.error('Failed to create campaign:', campaign.message);
  }
} catch (error) {
  console.error('API Error:', error);
}
```

## TypeScript Support

The library includes comprehensive TypeScript definitions for all API entities:

```typescript
import { 
  Campaign, 
  LineItem, 
  Creative, 
  CreativeType,
  BeeswaxResponse 
} from 'beeswax-client';

// Type-safe responses
const response: BeeswaxResponse<Campaign> = await client.campaigns.find(123);
if (response.success && response.payload) {
  const campaign: Campaign = response.payload;
  console.log(campaign.campaign_name);
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

To run integration tests, create a `.env.test` file with your test credentials:

```env
BEESWAX_TEST_EMAIL=your-test-email@example.com
BEESWAX_TEST_PASSWORD=your-test-password
```

## API Coverage

- ✅ Advertisers
- ✅ Campaigns
- ✅ Line Items
- ✅ Creatives
- ✅ Creative Line Item Associations
- ✅ Creative Assets
- ✅ Segments
- ✅ Reports
- ⚠️  Targeting Templates (deprecated - use Targeting Expressions API v2)

## Important Notes

1. **Budget values**: All budget values are in cents (e.g., 10000 = $100.00)
2. **Dates**: Use ISO date format (YYYY-MM-DD)
3. **Creative Types**: Use numeric values (0=Display, 1=Video, 2=Native)
4. **Targeting**: The old targeting_template endpoint is deprecated. New integrations should use the v2 targeting-expressions API directly.
5. **Active Status**: Line items and creatives should be created as `active: false` and activated only after all associations are set up.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and feature requests, please use the [GitHub issues page](https://github.com/yourusername/beeswax-client/issues).