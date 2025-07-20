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
  
  // Override create to ensure budget_type is set
  async create(body: Partial<Campaign>): Promise<BeeswaxResponse<Campaign>> {
    // Set default budget_type to 2 (currency in cents) if not specified
    const campaignData = {
      ...body,
      budget_type: body.budget_type !== undefined ? body.budget_type : 2
    };
    
    return super.create(campaignData);
  }
}

export class LineItemResource extends BaseResource<LineItem> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/line_item', 'line_item_id');
  }
}

export class CreativeResource extends BaseResource<Creative> {
  constructor(client: BeeswaxClient) {
    super(client, '/rest/creative', 'creative_id');
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
  async create(body: Partial<TargetingTemplate>): Promise<BeeswaxResponse<TargetingTemplate>> {
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
    } catch (error) {
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