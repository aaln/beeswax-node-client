import { BaseResource } from './BaseResource';
import { BeeswaxClient } from '../BeeswaxClient';
import {
  Advertiser,
  Campaign,
  LineItem,
  Creative,
  CreativeLineItem,
  TargetingTemplate,
  CreativeAsset,
  Segment,
  Report,
  BeeswaxResponse
} from '../types';

export class AdvertiserResource extends BaseResource<Advertiser> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/advertiser', 'advertiser_id');
  }
}

export class CampaignResource extends BaseResource<Campaign> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/campaign', 'campaign_id');
  }
  
  // Override create to ensure budget_type is set and handle field name mapping
  async create(body: Partial<Campaign>): Promise<BeeswaxResponse<Campaign>> {
    // Ensure we have the required fields in the correct format
    const campaignData: any = {
      ...body,
      budget_type: body.budget_type !== undefined ? body.budget_type : 2
    };
    
    // Despite the error message, the API might actually want OLD field names
    // Let's try using campaign_name and campaign_budget
    if (body.name || body.campaign_name) {
      campaignData.campaign_name = body.campaign_name || body.name;
      delete campaignData.name;
    }
    if (body.budget !== undefined || body.campaign_budget !== undefined) {
      campaignData.campaign_budget = body.campaign_budget !== undefined ? body.campaign_budget : body.budget;
      delete campaignData.budget;
    }
    
    // Debug logging
    if (process.env.DEBUG_BEESWAX) {
      console.log('CampaignResource.create - Using OLD field names');
      console.log('Final data:', JSON.stringify(campaignData, null, 2));
    }
    
    return super.create(campaignData);
  }
  
  // Override edit to handle field name mapping
  async edit(id: number | string, body: Partial<Campaign>, failOnNotFound = false): Promise<BeeswaxResponse<Campaign>> {
    const campaignData: any = { ...body };
    
    // Convert new field names to old ones for updates
    if (body.name || body.campaign_name) {
      campaignData.campaign_name = body.campaign_name || body.name;
      delete campaignData.name;
    }
    if (body.budget !== undefined || body.campaign_budget !== undefined) {
      campaignData.campaign_budget = body.campaign_budget !== undefined ? body.campaign_budget : body.budget;
      delete campaignData.budget;
    }
    
    return super.edit(id, campaignData, failOnNotFound);
  }
}

export class LineItemResource extends BaseResource<LineItem> {
  constructor(client: BeeswaxClient) {
    // Use v1 API for compatibility with existing code
    // We'll switch to v2 only for create
    super(client, '/rest/line_item', 'line_item_id');
  }
  
  // Override create to handle field name mapping for v2 API
  async create(body: Partial<LineItem>): Promise<BeeswaxResponse<LineItem>> {
    const lineItemData: any = { ...body };
    
    // v2 API expects NEW field names
    // Convert old field names to new ones
    if (body.line_item_name && !lineItemData.name) {
      lineItemData.name = body.line_item_name;
      delete lineItemData.line_item_name;
    }
    if (body.line_item_type && !lineItemData.type) {
      lineItemData.type = body.line_item_type;
      delete lineItemData.line_item_type;
    }
    if (body.line_item_budget !== undefined && !lineItemData.budget) {
      lineItemData.budget = body.line_item_budget;
      delete lineItemData.line_item_budget;
    }
    
    // Ensure type field is set (required by v2 API)
    if (!lineItemData.type) {
      lineItemData.type = 'banner'; // Default type
    }
    
    // Set id to null for creation (as shown in curl)
    lineItemData.id = null;
    
    // Remove line_item_id if present (v2 uses 'id')
    delete lineItemData.line_item_id;
    
    // Ensure spend_budget has proper structure if not provided
    if (!lineItemData.spend_budget) {
      lineItemData.spend_budget = {
        lifetime: null,
        daily: null,
        include_fees: true
      };
    }
    
    // Set frequency_caps to null if not provided (matching curl)
    if (!lineItemData.frequency_caps) {
      lineItemData.frequency_caps = null;
    }
    
    if (process.env.DEBUG_BEESWAX) {
      console.log('LineItemResource.create - Using v2 API with NEW field names');
      console.log('Final data:', JSON.stringify(lineItemData, null, 2));
    }
    
    // Call the v2 API directly for creation
    const response = await this.client.request('POST', '/rest/v2/line-items', { body: lineItemData });
    
    // v2 API returns the object directly, not wrapped
    // Check if it's a direct response (has id field) or wrapped response
    const responseData = response as any;
    if (responseData && responseData.id) {
      return {
        success: true,
        payload: {
          ...responseData,
          line_item_id: responseData.id // Map id back to line_item_id for compatibility
        } as LineItem
      };
    }
    
    // If response is already in BeeswaxResponse format
    if (response && response.success !== undefined) {
      return response;
    }
    
    return {
      success: false,
      message: 'Unexpected response format',
      errors: [JSON.stringify(response)]
    };
  }
}

export class CreativeResource extends BaseResource<Creative> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/creative', 'creative_id');
  }
  
  // Override create to handle field name mapping
  async create(body: Partial<Creative>): Promise<BeeswaxResponse<Creative>> {
    const creativeData: any = { ...body };
    
    // Despite the error message, the API might actually want OLD field names
    // Let's try using creative_name and creative_type
    if (body.name || body.creative_name) {
      creativeData.creative_name = body.creative_name || body.name;
      delete creativeData.name;
    }
    
    // Handle type conversion - API expects integer for creative_type
    let typeValue = body.creative_type !== undefined ? body.creative_type : body.type;
    if (typeValue !== undefined) {
      // Convert string types to integers
      if (typeof typeValue === 'string') {
        const typeMap: { [key: string]: number } = {
          'display': 0,
          'banner': 0,
          'video': 1,
          'native': 2
        };
        typeValue = typeMap[typeValue.toLowerCase()] !== undefined ? typeMap[typeValue.toLowerCase()] : typeValue;
      }
      creativeData.creative_type = typeValue;
      delete creativeData.type;
    }
    
    if (body.attributes || body.creative_attributes) {
      creativeData.creative_attributes = body.creative_attributes || body.attributes;
      delete creativeData.attributes;
    }
    
    return super.create(creativeData);
  }
}

export class CreativeLineItemResource extends BaseResource<CreativeLineItem> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/creative_line_item', 'cli_id');
  }
}

export class TargetingTemplateResource extends BaseResource<TargetingTemplate> {
  constructor(client: BeeswaxClient) {
    // Note: targeting_template is deprecated, but we'll keep using it for compatibility
    // New integrations should use /rest/v2/targeting-expressions directly
    super(client, '/rest/targeting_template', 'targeting_template_id');
  }
  
  // Override methods to handle deprecation warning
  async create(_body: Partial<TargetingTemplate>): Promise<BeeswaxResponse<TargetingTemplate>> {
    // The old endpoint is deprecated but might still work for some accounts
    // Return a warning message instead of failing
    return {
      success: false,
      message: 'Targeting templates are deprecated. Please use targeting expressions API directly.',
      code: 410
    };
  }
  
  async query(body?: Record<string, any>): Promise<BeeswaxResponse<TargetingTemplate[]>> {
    // For query, we can try the old endpoint
    try {
      return await super.query(body);
    } catch (_error) {
      // If it fails, return empty array with warning
      return {
        success: true,
        payload: [],
        message: 'Targeting templates are deprecated. Please use targeting expressions API directly.'
      };
    }
  }
}

export class CreativeAssetResource extends BaseResource<CreativeAsset> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/creative_asset', 'creative_asset_id');
  }
}

export class SegmentResource extends BaseResource<Segment> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/segment', 'segment_id');
  }
}

export class ReportResource extends BaseResource<Report> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/report', 'report_id');
  }
}