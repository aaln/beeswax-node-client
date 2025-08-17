import { BeeswaxClient } from '../BeeswaxClient';
import {
  LineItem,
  CampaignCreationOptions,
  FullCampaignResponse,
  BeeswaxResponse
} from '../types';
import { delay } from '../utils/helpers';

export class CampaignMacros {
  constructor(private client: BeeswaxClient) {}

  /**
   * Create a full campaign with line items, creatives, and targeting
   */
  async createFullCampaign(options: CampaignCreationOptions): Promise<BeeswaxResponse<FullCampaignResponse>> {
    try {
      // Step 1: Create campaign
      const campaignData = {
        advertiser_id: options.advertiser_id,
        name: options.name || options.campaign_name,
        budget: options.budget || options.campaign_budget,
        budget_type: options.budget_type || 2, // Ensure budget type is set
        start_date: options.start_date,
        end_date: options.end_date,
        active: false // Start inactive until everything is set up
      };

      const campaignResponse = await this.client.campaigns.create(campaignData);
      if (!campaignResponse.success || !campaignResponse.payload) {
        throw new Error('Failed to create campaign');
      }

      const campaign = campaignResponse.payload;
      if (!campaign.campaign_id) {
        throw new Error('Campaign ID not returned from API');
      }
      const result: FullCampaignResponse = {
        campaign,
        line_items: [],
        creatives: [],
        creative_line_items: [],
        targeting_templates: []
      };

      // Step 2: Create targeting templates if provided
      if (options.targeting_templates) {
        for (const templateOptions of options.targeting_templates) {
          const templateData = {
            advertiser_id: options.advertiser_id,
            targeting_template_name: templateOptions.targeting_template_name,
            targeting: templateOptions.targeting,
            active: true
          };

          const templateResponse = await this.client.targetingTemplates.create(templateData);
          if (templateResponse.success && templateResponse.payload) {
            result.targeting_templates?.push(templateResponse.payload);
          }
        }
      }

      // Step 3: Create line items and their associated creatives
      for (const lineItemOptions of options.line_items) {
        // Create line item using the helper method
        const lineItemResponse = await this.client.createLineItem({
          campaign_id: campaign.campaign_id,
          name: lineItemOptions.name || lineItemOptions.line_item_name,
          type: lineItemOptions.type || 'banner',
          guaranteed: lineItemOptions.guaranteed || false,
          currency: lineItemOptions.currency || 'USD',
          budget_type: lineItemOptions.budget_type || 'spend including vendor fees',
          spend_budget: lineItemOptions.spend_budget || {
            lifetime: String(lineItemOptions.budget || lineItemOptions.line_item_budget || 0),
            include_fees: true
          },
          bidding: lineItemOptions.bidding || {
            strategy: 'CPM',
            values: {
              cpm_bid: lineItemOptions.bid_price || 3
            },
            pacing: 'none',
            custom: false,
            bid_shading_control: 'normal'
          },
          frequency_caps: lineItemOptions.frequency_caps,
          targeting: lineItemOptions.targeting,
          targeting_expression_id: lineItemOptions.targeting_expression_id,
          start_date: lineItemOptions.start_date,
          end_date: lineItemOptions.end_date,
          active: lineItemOptions.active || false // Line items must be inactive until creatives are attached
        });

        if (!lineItemResponse.success || !lineItemResponse.payload) {
          console.error('Failed to create line item:', lineItemOptions.line_item_name);
          continue;
        }

        const lineItem = lineItemResponse.payload;
        result.line_items.push(lineItem);

        // Create creatives for this line item
        if (lineItemOptions.creatives) {
          for (const creativeOptions of lineItemOptions.creatives) {
            // Upload asset if URL provided
            let creativeAssetId: number | undefined;
            if (creativeOptions.asset_url) {
              try {
                const asset = await this.client.uploadCreativeAsset({
                  advertiser_id: options.advertiser_id,
                  sourceUrl: creativeOptions.asset_url,
                  creative_asset_name: creativeOptions.creative_name
                });
                creativeAssetId = asset.creative_asset_id;
              } catch (error) {
                console.error('Failed to upload creative asset:', error);
              }
            }

            // Create creative
            const creativeData: any = {
              advertiser_id: options.advertiser_id,
              name: creativeOptions.name || creativeOptions.creative_name,
              type: creativeOptions.type || creativeOptions.creative_type || 'display',
              creative_template_id: creativeOptions.creative_template_id || 1, // Default to 1 for standard display
              width: creativeOptions.width,
              height: creativeOptions.height,
              click_url: creativeOptions.click_url || 'https://example.com',
              secure: true,
              active: false // Creatives need content before being activated
            };

            // Handle attributes using both old and new field names
            if (creativeOptions.attributes || creativeOptions.creative_attributes) {
              creativeData.attributes = creativeOptions.attributes || creativeOptions.creative_attributes;
            }

            if (creativeAssetId) {
              creativeData.creative_asset_id = creativeAssetId;
            }

            const creativeResponse = await this.client.creatives.create(creativeData);
            if (!creativeResponse.success || !creativeResponse.payload) {
              console.error('Failed to create creative:', creativeOptions.name || creativeOptions.creative_name);
              continue;
            }

            const creative = creativeResponse.payload;
            result.creatives.push(creative);

            // Create creative-line item association
            if (!creative.creative_id || !lineItem.line_item_id) {
              console.error('Missing IDs for creative-line item association');
              continue;
            }
            const cliData = {
              creative_id: creative.creative_id,
              line_item_id: lineItem.line_item_id,
              active: true,
              weighting: 100
            };

            const cliResponse = await this.client.creativeLineItems.create(cliData);
            if (cliResponse.success && cliResponse.payload) {
              result.creative_line_items.push(cliResponse.payload);
            }
          }
        }
      }

      return {
        success: true,
        payload: result
      };

    } catch (error: any) {
      console.error('Full campaign creation error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create full campaign',
        errors: [JSON.stringify(error)]
      };
    }
  }

  /**
   * Clone an existing campaign with all its components
   */
  async cloneCampaign(
    campaignId: number, 
    newName: string, 
    options?: {
      start_date?: string;
      end_date?: string;
      budget_multiplier?: number;
      clone_creatives?: boolean;
      clone_targeting?: boolean;
    }
  ): Promise<BeeswaxResponse<FullCampaignResponse>> {
    try {
      // Get original campaign
      const campaignResponse = await this.client.campaigns.find(campaignId);
      if (!campaignResponse.success || !campaignResponse.payload) {
        throw new Error('Campaign not found');
      }

      const originalCampaign = campaignResponse.payload;

      // Create new campaign - exclude read-only fields
      const {
        campaign_id: _campaign_id,
        created_date: _created_date,
        updated_date: _updated_date,
        create_date: _create_date,
        update_date: _update_date,
        push_status: _push_status,
        push_update: _push_update,
        campaign_spend: _campaign_spend,
        buzz_key: _buzz_key,
        last_active: _last_active,
        ...campaignFields
      } = originalCampaign;
      
      const newCampaignData = {
        ...campaignFields,
        name: newName
      };

      if (options?.start_date) {
        newCampaignData.start_date = options.start_date;
      }
      if (options?.end_date) {
        newCampaignData.end_date = options.end_date;
      }
      if (options?.budget_multiplier) {
        newCampaignData.campaign_budget = (originalCampaign.campaign_budget || 0) * options.budget_multiplier;
      }

      const newCampaignResponse = await this.client.campaigns.create(newCampaignData);
      if (!newCampaignResponse.success || !newCampaignResponse.payload) {
        throw new Error('Failed to create new campaign');
      }

      const newCampaign = newCampaignResponse.payload;
      if (!newCampaign.campaign_id) {
        throw new Error('New campaign ID not returned from API');
      }
      const result: FullCampaignResponse = {
        campaign: newCampaign,
        line_items: [],
        creatives: [],
        creative_line_items: [],
        targeting_templates: []
      };

      // Get and clone line items
      const lineItemsResponse = await this.client.lineItems.query({
        campaign_id: campaignId
      });

      if (lineItemsResponse.success && lineItemsResponse.payload) {
        for (const lineItem of lineItemsResponse.payload) {
          // Exclude read-only fields from line item
          const {
            line_item_id: _line_item_id,
            created_date: _created_date,
            updated_date: _updated_date,
            create_date: _create_date,
            update_date: _update_date,
            push_status: _push_status,
            push_update: _push_update,
            line_item_spend: _line_item_spend,
            line_item_impressions: _line_item_impressions,
            buzz_key: _buzz_key,
            last_active: _last_active,
            line_item_version: _line_item_version,
            has_skad_assignment: _has_skad_assignment,
            account_id: _account_id,
            ...lineItemFields
          } = lineItem;
          
          const newLineItemData = {
            ...lineItemFields,
            campaign_id: newCampaign.campaign_id
          };

          if (options?.budget_multiplier) {
            newLineItemData.line_item_budget = (lineItem.line_item_budget || 0) * options.budget_multiplier;
          }

          const newLineItemResponse = await this.client.lineItems.create(newLineItemData);
          if (newLineItemResponse.success && newLineItemResponse.payload) {
            result.line_items.push(newLineItemResponse.payload);

            // Clone creative associations if requested
            if (options?.clone_creatives !== false) {
              const cliResponse = await this.client.creativeLineItems.query({
                line_item_id: lineItem.line_item_id
              });

              if (cliResponse.success && cliResponse.payload) {
                for (const cli of cliResponse.payload) {
                  if (!newLineItemResponse.payload.line_item_id) {
                    console.error('Missing line item ID for CLI association');
                    continue;
                  }
                  const newCliData = {
                    creative_id: cli.creative_id,
                    line_item_id: newLineItemResponse.payload.line_item_id,
                    active: cli.active,
                    weighting: cli.weighting
                  };

                  const newCliResponse = await this.client.creativeLineItems.create(newCliData);
                  if (newCliResponse.success && newCliResponse.payload) {
                    result.creative_line_items.push(newCliResponse.payload);
                  }
                }
              }
            }
          }

          // Small delay to avoid rate limiting
          await delay(100);
        }
      }

      return {
        success: true,
        payload: result
      };

    } catch (error: any) {
      console.error('Clone campaign error:', error);
      return {
        success: false,
        message: error.message || 'Failed to clone campaign',
        errors: [JSON.stringify(error)]
      };
    }
  }

  /**
   * Bulk update campaign status (pause/resume)
   */
  async bulkUpdateCampaignStatus(
    campaignIds: number[], 
    active: boolean
  ): Promise<BeeswaxResponse<{ updated: number; failed: number }>> {
    let updated = 0;
    let failed = 0;

    for (const campaignId of campaignIds) {
      try {
        const response = await this.client.campaigns.edit(campaignId, { active });
        if (response.success) {
          updated++;
        } else {
          failed++;
        }
      } catch (_error) {
        failed++;
      }

      // Small delay to avoid rate limiting
      await delay(50);
    }

    return {
      success: true,
      payload: { updated, failed }
    };
  }

  /**
   * Get campaign performance summary
   */
  async getCampaignPerformance(
    campaignId: number,
    startDate: string,
    endDate: string
  ): Promise<BeeswaxResponse<any>> {
    try {
      // This would typically call a reporting endpoint
      // Since we don't have the exact API docs, this is a placeholder
      const reportData = {
        advertiser_id: 0, // Would need to get this from campaign
        report_name: `Campaign ${campaignId} Performance`,
        report_type: 'campaign_performance',
        dimensions: ['campaign_id', 'date'],
        metrics: ['impressions', 'clicks', 'conversions', 'spend'],
        filters: {
          campaign_id: campaignId
        },
        start_date: startDate,
        end_date: endDate
      };

      // Create and run report
      const reportResponse = await this.client.reports.create(reportData);
      
      return reportResponse;

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get campaign performance',
        errors: [error.toString()]
      };
    }
  }

  /**
   * Bulk create line items for a campaign
   */
  async bulkCreateLineItems(
    campaignId: number,
    lineItems: Array<{
      name: string;
      budget: number;
      bid_price: number;
      targeting?: any;
    }>
  ): Promise<BeeswaxResponse<LineItem[]>> {
    const created: LineItem[] = [];
    const errors: string[] = [];

    // Get campaign to verify it exists and get advertiser_id
    const campaignResponse = await this.client.campaigns.find(campaignId);
    if (!campaignResponse.success || !campaignResponse.payload) {
      return {
        success: false,
        message: 'Campaign not found'
      };
    }

    // const campaign = campaignResponse.payload; // Currently unused, kept for future use

    for (const item of lineItems) {
      try {
        const response = await this.client.createLineItem({
          campaign_id: campaignId,
          name: item.name,
          type: 'banner',
          budget_type: 'spend including vendor fees',
          spend_budget: {
            lifetime: String(item.budget),
            include_fees: true
          },
          bidding: {
            strategy: 'CPM',
            values: {
              cpm_bid: item.bid_price || 3
            },
            pacing: 'none',
            custom: false,
            bid_shading_control: 'normal'
          },
          targeting: item.targeting,
          active: false // Line items must be inactive until creatives are attached
        });
        if (response.success && response.payload) {
          created.push(response.payload);
        } else {
          errors.push(`Failed to create line item: ${item.name}`);
        }
      } catch (error: any) {
        errors.push(`Error creating line item ${item.name}: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      await delay(100);
    }

    return {
      success: errors.length === 0,
      payload: created,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}