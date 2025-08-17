import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';
import axiosRetry from 'axios-retry';
import FormData from 'form-data';
import { 
  BeeswaxClientOptions, 
  BeeswaxCredentials, 
  BeeswaxResponse, 
  UploadCreativeAssetParams,
  CreativeAsset
} from './types';
import {
  AdvertiserResource,
  CampaignResource,
  LineItemResource,
  CreativeResource,
  CreativeLineItemResource,
  TargetingTemplateResource,
  CreativeAssetResource,
  SegmentResource,
  ReportResource
} from './resources';
import { CampaignMacros } from './macros/CampaignMacros';

export class BeeswaxClient {
  private apiRoot: string;
  private creds: BeeswaxCredentials;
  private axiosInstance: AxiosInstance;
  private authPromise?: Promise<void>;
  private sessionCookies?: string;

  // Resources
  public advertisers: AdvertiserResource;
  public campaigns: CampaignResource;
  public lineItems: LineItemResource;
  public creatives: CreativeResource;
  public creativeLineItems: CreativeLineItemResource;
  public targetingTemplates: TargetingTemplateResource;
  public creativeAssets: CreativeAssetResource;
  public segments: SegmentResource;
  public reports: ReportResource;

  // Macros
  public macros: CampaignMacros;

  constructor(options: BeeswaxClientOptions) {
    if (!options.creds || !options.creds.email || !options.creds.password) {
      throw new Error('Must provide creds object with email + password');
    }

    if (!options.apiRoot) {
      throw new Error('Must provide apiRoot in options (e.g., https://example.api.beeswax.com)');
    }
    this.apiRoot = options.apiRoot;
    this.creds = options.creds;

    // Setup axios instance with defaults
    this.axiosInstance = axios.create({
      baseURL: this.apiRoot,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });

    // Setup retry logic
    if (options.retryOptions) {
      axiosRetry(this.axiosInstance, {
        retries: options.retryOptions.retries || 3,
        retryDelay: options.retryOptions.retryDelay || axiosRetry.exponentialDelay,
        retryCondition: options.retryOptions.retryCondition || axiosRetry.isNetworkOrIdempotentRequestError
      });
    }

    // Setup request/response interceptors
    this.setupInterceptors();

    // Initialize resources
    this.advertisers = new AdvertiserResource(this);
    this.campaigns = new CampaignResource(this);
    this.lineItems = new LineItemResource(this);
    this.creatives = new CreativeResource(this);
    this.creativeLineItems = new CreativeLineItemResource(this);
    this.targetingTemplates = new TargetingTemplateResource(this);
    this.creativeAssets = new CreativeAssetResource(this);
    this.segments = new SegmentResource(this);
    this.reports = new ReportResource(this);

    // Initialize macros
    this.macros = new CampaignMacros(this);
  }

  private setupInterceptors(): void {
    // Request interceptor to add cookies
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.sessionCookies) {
          config.headers['Cookie'] = this.sessionCookies;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to save cookies and handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Save cookies from set-cookie header
        const setCookies = response.headers['set-cookie'];
        if (setCookies) {
          this.sessionCookies = setCookies.join('; ');
        }
        return response;
      },
      async (error) => {
        // Handle 401 unauthorized
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          await this.authenticate();
          return this.axiosInstance(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  async authenticate(): Promise<void> {
    // Prevent multiple simultaneous auth requests
    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = this.performAuthentication();
    
    try {
      await this.authPromise;
    } finally {
      this.authPromise = undefined;
    }
  }

  private async performAuthentication(): Promise<void> {
    try {
      const response = await this.axiosInstance.post('/rest/authenticate', {
        email: this.creds.email,
        password: this.creds.password,
        keep_logged_in: true
      });

      if (response.data.success === false) {
        throw new Error(`Authentication failed: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Authentication failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async request<T = any>(
    method: Method, 
    endpoint: string, 
    options?: { 
      body?: any; 
      params?: any; 
      headers?: any;
    }
  ): Promise<BeeswaxResponse<T>> {
    const config: AxiosRequestConfig = {
      method,
      url: endpoint,
      headers: options?.headers
    };

    // For GET requests, use params instead of data
    if (method.toUpperCase() === 'GET') {
      config.params = options?.body || options?.params;
    } else {
      config.data = options?.body;
      config.params = options?.params;
    }

    // Debug logging
    if (process.env.DEBUG_BEESWAX) {
      console.log(`BeeswaxClient.request - ${method} ${endpoint}`);
      console.log('Request data:', JSON.stringify(config.data, null, 2));
    }
    
    try {
      const response = await this.axiosInstance.request(config);
      
      if (process.env.DEBUG_BEESWAX) {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
      if (response.data.success === false) {
        throw new Error(JSON.stringify(response.data));
      }

      return response.data;
    } catch (error: any) {
      if (process.env.DEBUG_BEESWAX) {
        console.log('Error response:', error.response?.data || error.message);
      }
      if (error.response?.data) {
        throw error.response.data;
      }
      throw error;
    }
  }

  async uploadCreativeAsset(params: UploadCreativeAssetParams): Promise<CreativeAsset> {
    if (!params.sourceUrl) {
      throw new Error('uploadCreativeAsset params requires a sourceUrl property.');
    }

    // Get file size if not provided
    const assetDef: any = {
      advertiser_id: params.advertiser_id,
      creative_asset_name: params.creative_asset_name,
      notes: params.notes,
      active: params.active !== undefined ? params.active : true
    };

    // Extract filename from URL if not provided
    if (!assetDef.creative_asset_name) {
      const urlParts = params.sourceUrl.split('/');
      assetDef.creative_asset_name = urlParts[urlParts.length - 1];
    }

    // Get file size if not provided
    if (!params.size_in_bytes) {
      try {
        const headResponse = await axios.head(params.sourceUrl);
        assetDef.size_in_bytes = parseInt(headResponse.headers['content-length'] || '0', 10);
      } catch (_error) {
        console.warn('Unable to detect content-length of sourceUrl:', params.sourceUrl);
      }
    } else {
      assetDef.size_in_bytes = params.size_in_bytes;
    }

    // Create the asset
    const createResponse = await this.request<{ id: number }>('POST', '/rest/creative_asset', {
      body: assetDef
    });

    if (!createResponse.payload?.id) {
      throw new Error('Failed to create creative asset');
    }

    const assetId = createResponse.payload.id;

    // Upload the file
    const form = new FormData();
    const fileStream = await axios.get(params.sourceUrl, { responseType: 'stream' });
    form.append('creative_content', fileStream.data);

    await this.request('POST', `/rest/creative_asset/upload/${assetId}`, {
      body: form,
      headers: form.getHeaders()
    });

    // Get the updated asset
    const assetResponse = await this.creativeAssets.find(assetId);
    
    if (!assetResponse.payload) {
      throw new Error('Failed to retrieve uploaded creative asset');
    }

    return assetResponse.payload;
  }

  // Utility method to get current user info
  async getCurrentUser(): Promise<BeeswaxResponse<any>> {
    try {
      // Create a minimal request without extra headers that cause issues
      const response = await axios.get(`${this.apiRoot}/rest/user/current`, {
        headers: {
          'Cookie': this.sessionCookies || ''
        },
        withCredentials: true
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  }

  // Utility method to get account info
  async getAccountInfo(): Promise<BeeswaxResponse<any>> {
    return this.request('GET', '/rest/account');
  }

  // Helper method to create a line item with sensible defaults
  async createLineItem(params: {
    campaign_id: number;
    name?: string;
    line_item_name?: string; // Deprecated, use 'name' instead
    type?: string;
    budget?: number;
    line_item_budget?: number; // Deprecated, use 'budget' instead
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
      pacing?: string;
      custom?: boolean;
      bid_shading_control?: string;
    };
    cpm_bid?: number; // Deprecated, use bidding.values.cpm_bid instead
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
    targeting_expression_id?: number;
    targeting?: any;
    active?: boolean;
    guaranteed?: boolean;
    currency?: string;
    budget_type?: string;
    [key: string]: any;
  }): Promise<BeeswaxResponse<any>> {
    // Get campaign details to inherit settings
    const campaignResponse = await this.campaigns.find(params.campaign_id);
    if (!campaignResponse.success || !campaignResponse.payload) {
      throw new Error('Campaign not found');
    }
    
    const campaign = campaignResponse.payload;
    
    // Build line item with all required fields
    // Support both old and new field names
    const lineItemData: any = {
      advertiser_id: campaign.advertiser_id,
      campaign_id: params.campaign_id,
      name: params.name || params.line_item_name,
      type: params.type || 'banner',
      guaranteed: params.guaranteed !== undefined ? params.guaranteed : false,
      currency: params.currency || campaign.currency || 'USD',
      budget_type: params.budget_type || 'spend including vendor fees',
      
      // Handle spend_budget
      spend_budget: params.spend_budget || {
        lifetime: String(params.budget || params.line_item_budget || 0),
        include_fees: true
      },
      
      // Bidding configuration - use provided bidding or construct from legacy params
      bidding: params.bidding || {
        strategy: 'CPM',
        values: {
          cpm_bid: params.cpm_bid || 3
        },
        pacing: 'none',
        custom: false,
        bid_shading_control: 'normal'
      },
      
      // Dates - inherit from campaign if not provided
      start_date: params.start_date || campaign.start_date,
      end_date: params.end_date || campaign.end_date,
      
      // Other settings
      active: params.active !== undefined ? params.active : false,
      
      // Frequency caps - use provided or set to null (matching API expectations)
      frequency_caps: params.frequency_caps || null
    };
    
    // Add any additional custom fields from params (except the ones we've already handled)
    const excludeFields = ['campaign_id', 'name', 'line_item_name', 'type', 'guaranteed', 
                          'currency', 'budget_type', 'spend_budget', 'bidding', 'cpm_bid',
                          'frequency_caps', 'start_date', 'end_date', 'active', 'budget', 
                          'line_item_budget'];
    
    for (const key in params) {
      if (!excludeFields.includes(key) && params[key] !== undefined) {
        lineItemData[key] = params[key];
      }
    }
    
    // Add targeting expression if provided
    if (params.targeting_expression_id) {
      (lineItemData as any).targeting_expression_id = params.targeting_expression_id;
    }
    
    return this.lineItems.create(lineItemData);
  }
}