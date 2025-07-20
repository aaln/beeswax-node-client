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

    try {
      const response = await this.axiosInstance.request(config);
      
      if (response.data.success === false) {
        throw new Error(JSON.stringify(response.data));
      }

      return response.data;
    } catch (error: any) {
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
    line_item_name: string;
    line_item_budget: number;
    cpm_bid?: number;
    start_date?: string;
    end_date?: string;
    targeting_expression_id?: number;
    active?: boolean;
  }): Promise<BeeswaxResponse<any>> {
    // Get campaign details to inherit settings
    const campaignResponse = await this.campaigns.find(params.campaign_id);
    if (!campaignResponse.success || !campaignResponse.payload) {
      throw new Error('Campaign not found');
    }
    
    const campaign = campaignResponse.payload;
    
    // Build line item with all required fields
    const lineItemData = {
      advertiser_id: campaign.advertiser_id,
      campaign_id: params.campaign_id,
      line_item_name: params.line_item_name,
      line_item_budget: params.line_item_budget,
      line_item_type_id: 0,
      budget_type: 2,
      currency: campaign.currency || 'USD',
      
      // Bidding configuration
      bidding: {
        bidding_strategy: 'CPM_PACED',
        values: {
          cpm_bid: params.cpm_bid || 3
        },
        pacing: 'lifetime',
        bid_shading: true,
        pacing_behavior: 'even',
        catchup_behavior: 'even',
        bid_shading_win_rate_control: 'NORMAL',
        custom: false,
        multiplier: 1
      },
      
      // Dates - inherit from campaign if not provided
      start_date: params.start_date || campaign.start_date,
      end_date: params.end_date || campaign.end_date,
      
      // Other settings
      active: params.active !== undefined ? params.active : false,
      guaranteed: false,
      creative_weighting_method: 'RANDOM',
      frequency_cap: [],
      frequency_cap_type: 0,
      frequency_cap_vendor: null
    };
    
    // Add targeting expression if provided
    if (params.targeting_expression_id) {
      (lineItemData as any).targeting_expression_id = params.targeting_expression_id;
    }
    
    return this.lineItems.create(lineItemData);
  }
}