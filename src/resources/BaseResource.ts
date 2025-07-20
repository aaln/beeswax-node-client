import { BeeswaxClient } from '../BeeswaxClient';
import { BeeswaxResponse, QueryOptions } from '../types';
import { isPOJO } from '../utils/helpers';

export abstract class BaseResource<T> {
  protected client: BeeswaxClient;
  protected endpoint: string;
  protected idField: string;

  constructor(client: BeeswaxClient, endpoint: string, idField: string) {
    this.client = client;
    this.endpoint = endpoint;
    this.idField = idField;
  }

  async find(id: number | string): Promise<BeeswaxResponse<T>> {
    const body: any = {};
    body[this.idField] = id;
    
    const response = await this.client.request('GET', this.endpoint, { body });
    return {
      success: true,
      payload: response.payload?.[0]
    };
  }

  async query(body?: Record<string, any>): Promise<BeeswaxResponse<T[]>> {
    const response = await this.client.request('GET', this.endpoint, { body: body || {} });
    return {
      success: true,
      payload: response.payload || []
    };
  }

  async queryAll(body?: Record<string, any>): Promise<BeeswaxResponse<T[]>> {
    const results: T[] = [];
    const batchSize = 50;
    let offset = 0;

    while (true) {
      const queryBody: QueryOptions = {
        ...body,
        rows: batchSize,
        offset: offset,
        sort_by: this.idField
      };

      const response = await this.client.request('GET', this.endpoint, { body: queryBody });
      const batch = response.payload || [];
      results.push(...batch);

      if (batch.length < batchSize) {
        break;
      }

      offset += batchSize;
    }

    return {
      success: true,
      payload: results
    };
  }

  async create(body: Partial<T>): Promise<BeeswaxResponse<T>> {
    if (!isPOJO(body) || Object.keys(body).length === 0) {
      return {
        success: false,
        code: 400,
        message: 'Body must be non-empty object'
      };
    }

    const response = await this.client.request('POST', `${this.endpoint}/strict`, { body });
    
    if (response.success && response.payload?.id) {
      return await this.find(response.payload.id);
    }

    return response;
  }

  async edit(id: number | string, body: Partial<T>, failOnNotFound = false): Promise<BeeswaxResponse<T>> {
    if (!isPOJO(body) || Object.keys(body).length === 0) {
      return {
        success: false,
        code: 400,
        message: 'Body must be non-empty object'
      };
    }

    const updateBody: any = { ...body };
    updateBody[this.idField] = id;

    try {
      await this.client.request('PUT', `${this.endpoint}/strict`, { body: updateBody });
      return await this.find(id);
    } catch (error: any) {
      const notFound = this.isNotFoundError(error, 'update');
      
      if (notFound && !failOnNotFound) {
        return {
          success: false,
          code: 400,
          message: 'Not found'
        };
      }

      throw error;
    }
  }

  async delete(id: number | string, failOnNotFound = false): Promise<BeeswaxResponse<any>> {
    const body: any = {};
    body[this.idField] = id;

    try {
      const response = await this.client.request('DELETE', `${this.endpoint}/strict`, { body });
      return {
        success: true,
        payload: response.payload?.[0]
      };
    } catch (error: any) {
      const notFound = this.isNotFoundError(error, 'delete');
      
      if (notFound && !failOnNotFound) {
        return {
          success: false,
          code: 400,
          message: 'Not found'
        };
      }

      throw error;
    }
  }

  private isNotFoundError(error: any, action: string): boolean {
    try {
      const messages = error.error?.payload?.[0]?.message || [];
      return messages.some((msg: string) => 
        new RegExp(`Could not load object.*to ${action}`).test(msg)
      );
    } catch {
      return false;
    }
  }
}