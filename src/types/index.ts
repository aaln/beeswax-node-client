export enum CreativeType {
  DISPLAY = 0,
  VIDEO = 1,
  NATIVE = 2
}

export interface BeeswaxCredentials {
  email: string;
  password: string;
}

export interface BeeswaxClientOptions {
  apiRoot?: string;
  creds: BeeswaxCredentials;
  timeout?: number;
  retryOptions?: {
    retries?: number;
    retryDelay?: (retryCount: number) => number;
    retryCondition?: (error: any) => boolean;
  };
}

export interface BeeswaxResponse<T = any> {
  success: boolean;
  payload?: T;
  code?: number;
  message?: string;
  errors?: string[];
}

export interface QueryOptions {
  rows?: number;
  offset?: number;
  sort_by?: string;
  [key: string]: any;
}

export interface Advertiser {
  advertiser_id: number;
  advertiser_name: string;
  alternative_id?: string;
  active?: boolean;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface Campaign {
  campaign_id?: number;
  advertiser_id: number;
  name?: string;
  campaign_name?: string; // Deprecated, use 'name' instead
  campaign_budget?: number;
  budget?: number;
  budget_type?: number | string;
  start_date?: string;
  end_date?: string;
  active?: boolean;
  campaign_type?: string;
  type?: string;
  frequency_cap?: any;
  frequency_caps?: any;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface LineItem {
  line_item_id?: number;
  campaign_id: number;
  name?: string;
  line_item_name?: string; // Deprecated, use 'name' instead
  type?: string;
  line_item_type?: string; // Deprecated, use 'type' instead
  line_item_type_id?: number; // Deprecated
  guaranteed?: boolean;
  currency?: string;
  line_item_budget?: number;
  budget?: number;
  budget_type?: string;
  spend_budget?: {
    lifetime?: string | number;
    daily?: string | number;
    include_fees?: boolean;
  };
  bidding?: {
    strategy?: string;
    values?: {
      cpm_bid?: number;
      cpc_bid?: number;
      cpa_bid?: number;
    };
    bidding_strategy?: string; // Deprecated, use 'strategy' instead
    pacing?: string;
    custom?: boolean;
    bid_shading?: boolean;
    bid_shading_control?: string;
  };
  max_bid?: number;
  start_date?: string;
  end_date?: string;
  active?: boolean;
  targeting?: any;
  targeting_expression_id?: number;
  pacing?: string;
  delivery_model?: string;
  bid_strategy?: string;
  frequency_caps?: {
    id_type?: string;
    use_fallback?: boolean;
    id_vendor?: string | null;
    limits?: Array<{
      duration: number;
      impressions: string | number;
    }>;
  };
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface Creative {
  creative_id?: number;
  advertiser_id: number;
  name?: string;
  creative_name?: string; // Deprecated, use 'name' instead
  type?: string | number;
  creative_type?: number; // Deprecated, use 'type' instead. 0=Display, 1=Video, 2=Native
  creative_template_id?: number;
  width?: number;
  height?: number;
  secure?: boolean;
  active?: boolean;
  creative_attributes?: any;
  attributes?: any;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface CreativeLineItem {
  cli_id: number;
  creative_id: number;
  line_item_id: number;
  active?: boolean;
  weighting?: number;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface TargetingTemplate {
  targeting_template_id: number;
  advertiser_id: number;
  targeting_template_name: string;
  targeting?: any;
  active?: boolean;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface CreativeAsset {
  creative_asset_id: number;
  advertiser_id: number;
  creative_asset_name: string;
  size_in_bytes?: number;
  notes?: string;
  active?: boolean;
  asset_type?: string;
  url?: string;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface UploadCreativeAssetParams {
  advertiser_id: number;
  creative_asset_name?: string;
  size_in_bytes?: number;
  notes?: string;
  active?: boolean;
  sourceUrl: string;
}

export interface Segment {
  segment_id: number;
  advertiser_id: number;
  segment_name: string;
  segment_description?: string;
  active?: boolean;
  created_date?: string;
  updated_date?: string;
  [key: string]: any;
}

export interface Report {
  report_id: number;
  advertiser_id: number;
  report_name: string;
  report_type: string;
  dimensions: string[];
  metrics: string[];
  filters?: any;
  start_date: string;
  end_date: string;
  [key: string]: any;
}

// Macro functionality types
export interface CampaignCreationOptions {
  advertiser_id: number;
  name?: string;
  campaign_name?: string; // Deprecated, use 'name' instead
  budget?: number;
  campaign_budget?: number; // Deprecated, use 'budget' instead
  budget_type?: number | string;
  start_date: string;
  end_date: string;
  line_items: LineItemCreationOptions[];
  targeting_templates?: TargetingTemplateCreationOptions[];
  [key: string]: any;
}

export interface LineItemCreationOptions {
  name?: string;
  line_item_name?: string; // Deprecated, use 'name' instead
  type?: string;
  guaranteed?: boolean;
  currency?: string;
  budget?: number;
  line_item_budget?: number; // Deprecated, use 'budget' instead
  budget_type?: string;
  spend_budget?: {
    lifetime?: string | number;
    daily?: string | number;
    include_fees?: boolean;
  };
  bid_price?: number;
  bidding?: {
    strategy?: string;
    values?: {
      cpm_bid?: number;
      cpc_bid?: number;
      cpa_bid?: number;
    };
    pacing?: string;
    custom?: boolean;
    bid_shading_control?: string;
  };
  targeting_expression_id?: number;
  targeting?: any;
  creatives?: CreativeCreationOptions[];
  pacing?: string;
  delivery_model?: string;
  bid_strategy?: string;
  frequency_caps?: {
    id_type?: string;
    use_fallback?: boolean;
    id_vendor?: string | null;
    limits?: Array<{
      duration: number;
      impressions: string | number;
    }>;
  };
  start_date?: string;
  end_date?: string;
  active?: boolean;
  [key: string]: any;
}

export interface CreativeCreationOptions {
  name?: string;
  creative_name?: string; // Deprecated, use 'name' instead
  type?: string | number;
  creative_type?: string; // Deprecated, use 'type' instead
  creative_template_id?: number;
  width?: number;
  height?: number;
  attributes?: any;
  creative_attributes?: any; // Deprecated, use 'attributes' instead
  asset_url?: string;
  click_url?: string;
  [key: string]: any;
}

export interface TargetingTemplateCreationOptions {
  targeting_template_name: string;
  targeting: any;
}

export interface FullCampaignResponse {
  campaign: Campaign;
  line_items: LineItem[];
  creatives: Creative[];
  creative_line_items: CreativeLineItem[];
  targeting_templates?: TargetingTemplate[];
}