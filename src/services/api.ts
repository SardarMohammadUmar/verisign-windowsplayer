import type { CMSResponse } from '../types';
import config from '../../config.json';

export class ScreenNotFoundError extends Error {
  readonly status = 404;

  constructor(message = 'Screen not found') {
    super(message);
    this.name = 'ScreenNotFoundError';
  }
}

export async function fetchScreenData(screenCode: string): Promise<CMSResponse> {
  try {
    const response = await fetch(`${config.cmsApiBaseUrl}/screen/${screenCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      throw new ScreenNotFoundError();
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: CMSResponse = await response.json();
    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}

export function logError(error: Error, context: string): void {
  // In a real implementation, you would send this to your CMS logging endpoint
  console.error(`[${context}]`, error);
  
  // Example: Send to CMS logging API
  // fetch(`${config.cmsApiBaseUrl}/logs`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ error: error.message, context, timestamp: Date.now() }),
  // }).catch(console.error);
}

