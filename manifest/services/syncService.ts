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
 * Create or update a shipment on the server (upsert)
 */
export async function syncShipmentToServer(shipmentId: string, shipmentData: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Use PUT with the shipment ID in the URL to upsert (update existing or create new)
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentData),
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
  qtyReceived: number,
  username?: string,
  name?: string
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
          username,  // Include username
          name,      // Include name
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
 * Fetch all shipments from server
 */
export async function fetchAllShipments(): Promise<{
  success: boolean;
  shipments: any[];
  error?: string;
}> {
  try {
    console.log('📥 Fetching all shipments from server...');

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/shipments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Fetched ${result.shipments?.length || 0} shipments from server`);
    }

    return result;
  } catch (error) {
    console.error('💥 Error fetching shipments:', error);
    return {
      success: false,
      shipments: [],
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Batch upload all received items to server (optimized for minimal writes)
 * Uploads all items in a single request to minimize database operations
 */
export async function batchUploadReceivedItems(
  shipmentId: string,
  receivedItems: any[]
): Promise<{
  success: boolean;
  itemCount?: number;
  error?: string;
}> {
  try {
    console.log(`📤 Batch uploading ${receivedItems.length} received items...`);

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}/received-items/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receivedItems,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Successfully uploaded ${result.itemCount} items to server`);
      return {
        success: true,
        itemCount: result.itemCount,
      };
    } else {
      console.error('❌ Failed to batch upload:', result.error);
      return {
        success: false,
        error: result.error || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error('❌ Error batch uploading received items:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Fetch received items from server for merging with local state
 */
export async function fetchReceivedItemsForMerge(
  shipmentId: string
): Promise<{
  success: boolean;
  receivedItems: any[];
  error?: string;
}> {
  try {
    console.log(`🔄 Fetching received items for shipment ${shipmentId} to merge...`);

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/shipments/${shipmentId}/received-items`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Fetched ${result.receivedItems?.length || 0} received items from server`);

      // Data from JSONB is already in correct format (camelCase)
      // But we need to handle both old table format (snake_case) and new JSONB format
      const items = result.receivedItems || [];

      const transformedItems = items.map((item: any) => {
        // Check if item is from old table (has snake_case) or new JSONB (has camelCase)
        const isOldFormat = item.item_number !== undefined || item.qty_received !== undefined;

        if (isOldFormat) {
          // Old format from received_items table
          return {
            itemNumber: item.item_number || '',
            legacyItemNumber: item.legacy_item_number,
            description: item.description || 'Unknown Item',
            upc: item.upc,
            qtyReceived: item.qty_received || item.qtyReceived || 0,
            qtyExpected: item.qty_expected || item.qtyExpected || 0,
            discrepancy: (item.qty_received || item.qtyReceived || 0) - (item.qty_expected || item.qtyExpected || 0),
            documentId: item.document_id || item.documentId,
            scannedByDevice: item.scanned_by?.[0] || item.scannedBy?.[0],
            scannedAt: item.last_updated || item.scannedAt,
            scannedByUsername: item.scanned_by_username || item.scannedByUsername,
            scannedByName: item.scanned_by_name || item.scannedByName,
          };
        } else {
          // New format from JSONB (already camelCase)
          return {
            itemNumber: item.itemNumber || '',
            legacyItemNumber: item.legacyItemNumber,
            description: item.description || 'Unknown Item',
            upc: item.upc,
            qtyReceived: item.qtyReceived || 0,
            qtyExpected: item.qtyExpected || 0,
            discrepancy: item.discrepancy || (item.qtyReceived || 0) - (item.qtyExpected || 0),
            documentId: item.documentId,
            scannedByDevice: item.scannedBy?.[0],
            scannedAt: item.scannedAt,
            scannedByUsername: item.scannedByUsername,
            scannedByName: item.scannedByName,
          };
        }
      });

      return {
        success: true,
        receivedItems: transformedItems,
      };
    } else {
      console.error('❌ Failed to fetch received items:', result.error);
      return {
        success: false,
        receivedItems: [],
        error: result.error || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error('❌ Error fetching received items:', error);
    return {
      success: false,
      receivedItems: [],
      error: error.message || 'Network error',
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
