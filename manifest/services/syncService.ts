import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

const DEVICE_ID_KEY = 'device_id';
const LAST_SYNC_KEY = 'last_sync_timestamp';

/**
 * Generate or retrieve device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate a unique device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a temporary ID
    return `temp_${Date.now()}`;
  }
}

/**
 * Get last sync timestamp for a shipment
 */
async function getLastSyncTimestamp(shipmentId: string): Promise<number> {
  try {
    const key = `${LAST_SYNC_KEY}_${shipmentId}`;
    const timestamp = await AsyncStorage.getItem(key);
    return timestamp ? parseInt(timestamp) : 0;
  } catch (error) {
    console.error('Error getting last sync timestamp:', error);
    return 0;
  }
}

/**
 * Save last sync timestamp for a shipment
 */
async function saveLastSyncTimestamp(shipmentId: string, timestamp: number): Promise<void> {
  try {
    const key = `${LAST_SYNC_KEY}_${shipmentId}`;
    await AsyncStorage.setItem(key, timestamp.toString());
  } catch (error) {
    console.error('Error saving last sync timestamp:', error);
  }
}

/**
 * Create or update a shipment on the server
 */
export async function syncShipmentToServer(shipmentId: string, shipmentData: any): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipmentId,
        shipmentData,
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error syncing shipment to server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Push a received item to the server
 */
export async function pushReceivedItem(
  shipmentId: string,
  upc: string,
  qtyReceived: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const deviceId = await getDeviceId();

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}/received-items`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upc,
          qtyReceived,
          deviceId,
        }),
      }
    );

    // Check if response is OK and is JSON
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;

      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } else {
        // Server returned HTML or plain text error
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error pushing received item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Pull received items from server (get updates since last sync)
 */
export async function pullReceivedItems(shipmentId: string): Promise<{
  success: boolean;
  items: any[];
  serverTime?: number;
  error?: string;
}> {
  try {
    const lastSync = await getLastSyncTimestamp(shipmentId);

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}/received-items/sync?lastSync=${lastSync}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (result.success && result.serverTime) {
      // Save the server time as our last sync timestamp
      await saveLastSyncTimestamp(shipmentId, result.serverTime);
    }

    return result;
  } catch (error) {
    console.error('Error pulling received items:', error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get all received items from server
 */
export async function getAllReceivedItems(shipmentId: string): Promise<{
  success: boolean;
  items: any[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}/received-items`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error getting all received items:', error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Complete a shipment on the server
 */
export async function completeShipmentOnServer(shipmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error completing shipment on server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Delete a shipment from the server
 */
export async function deleteShipmentOnServer(shipmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting shipment from server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Sync all data - pull remote changes
 */
export async function syncAll(shipmentId: string): Promise<{
  success: boolean;
  updatedItems: any[];
  error?: string;
}> {
  try {
    // Pull updates from server
    const pullResult = await pullReceivedItems(shipmentId);

    if (!pullResult.success) {
      return {
        success: false,
        updatedItems: [],
        error: pullResult.error,
      };
    }

    return {
      success: true,
      updatedItems: pullResult.items,
    };
  } catch (error) {
    console.error('Error in sync all:', error);
    return {
      success: false,
      updatedItems: [],
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}
