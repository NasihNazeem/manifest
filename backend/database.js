const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create or update shipment
async function saveShipment(shipmentId, shipmentData) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .upsert({
        id: shipmentId,
        date: shipmentData.date,
        document_ids: shipmentData.documentIds,
        expected_items: shipmentData.expectedItems,
        status: shipmentData.status || 'in-progress',
        created_at: shipmentData.createdAt,
        completed_at: shipmentData.completedAt || null,
        last_updated: Date.now(),
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error saving shipment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveShipment:', error);
    return false;
  }
}

// Get shipment by ID
async function getShipment(shipmentId) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error getting shipment:', error);
      return null;
    }

    // Transform data back to original format
    return {
      id: data.id,
      date: data.date,
      documentIds: data.document_ids,
      expectedItems: data.expected_items,
      status: data.status,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      lastUpdated: data.last_updated,
    };
  } catch (error) {
    console.error('Error in getShipment:', error);
    return null;
  }
}

// Get all shipments
async function getAllShipments() {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all shipments:', error);
      return [];
    }

    // Transform data back to original format
    return data.map(shipment => ({
      id: shipment.id,
      date: shipment.date,
      documentIds: shipment.document_ids,
      expectedItems: shipment.expected_items,
      status: shipment.status,
      createdAt: shipment.created_at,
      completedAt: shipment.completed_at,
      lastUpdated: shipment.last_updated,
    }));
  } catch (error) {
    console.error('Error in getAllShipments:', error);
    return [];
  }
}

// Add or update received item for a shipment
async function addReceivedItem(shipmentId, upc, qtyReceived, deviceId) {
  try {
    // First check if shipment exists
    const shipment = await getShipment(shipmentId);
    if (!shipment) {
      return { success: false, error: 'Shipment not found' };
    }

    // Check if item already exists
    const { data: existing, error: fetchError } = await supabase
      .from('received_items')
      .select('*')
      .eq('shipment_id', shipmentId)
      .eq('upc', upc)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Error checking existing item:', fetchError);
      return { success: false, error: fetchError.message };
    }

    let result;

    if (existing) {
      // Update existing - add to quantity
      const newQty = existing.qty_received + qtyReceived;
      const scannedBy = existing.scanned_by || [];

      if (!scannedBy.includes(deviceId)) {
        scannedBy.push(deviceId);
      }

      const { data, error } = await supabase
        .from('received_items')
        .update({
          qty_received: newQty,
          scanned_by: scannedBy,
          last_updated: Date.now(),
        })
        .eq('shipment_id', shipmentId)
        .eq('upc', upc)
        .select()
        .single();

      if (error) {
        console.error('Error updating received item:', error);
        return { success: false, error: error.message };
      }

      result = data;
    } else {
      // Create new received item
      const { data, error } = await supabase
        .from('received_items')
        .insert({
          shipment_id: shipmentId,
          upc: upc,
          qty_received: qtyReceived,
          scanned_by: [deviceId],
          last_updated: Date.now(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating received item:', error);
        return { success: false, error: error.message };
      }

      result = data;
    }

    // Transform back to original format
    return {
      success: true,
      item: {
        upc: result.upc,
        qtyReceived: result.qty_received,
        scannedBy: result.scanned_by,
        lastUpdated: result.last_updated,
      }
    };
  } catch (error) {
    console.error('Error in addReceivedItem:', error);
    return { success: false, error: error.message };
  }
}

// Get all received items for a shipment
async function getReceivedItems(shipmentId) {
  try {
    const { data, error } = await supabase
      .from('received_items')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting received items:', error);
      return [];
    }

    // Transform back to original format
    return data.map(item => ({
      upc: item.upc,
      qtyReceived: item.qty_received,
      scannedBy: item.scanned_by,
      lastUpdated: item.last_updated,
    }));
  } catch (error) {
    console.error('Error in getReceivedItems:', error);
    return [];
  }
}

// Get received items updated after a timestamp
async function getReceivedItemsSince(shipmentId, timestamp) {
  try {
    const { data, error } = await supabase
      .from('received_items')
      .select('*')
      .eq('shipment_id', shipmentId)
      .gt('last_updated', timestamp)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting received items since timestamp:', error);
      return [];
    }

    // Transform back to original format
    return data.map(item => ({
      upc: item.upc,
      qtyReceived: item.qty_received,
      scannedBy: item.scanned_by,
      lastUpdated: item.last_updated,
    }));
  } catch (error) {
    console.error('Error in getReceivedItemsSince:', error);
    return [];
  }
}

// Complete shipment
async function completeShipment(shipmentId) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .update({
        status: 'completed',
        completed_at: Date.now(),
        last_updated: Date.now(),
      })
      .eq('id', shipmentId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Shipment not found' };
      }
      console.error('Error completing shipment:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in completeShipment:', error);
    return { success: false, error: error.message };
  }
}

// Delete shipment and all its received items
async function deleteShipment(shipmentId) {
  try {
    // Supabase will automatically delete received_items due to ON DELETE CASCADE
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('id', shipmentId);

    if (error) {
      console.error('Error deleting shipment:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteShipment:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  saveShipment,
  getShipment,
  getAllShipments,
  addReceivedItem,
  getReceivedItems,
  getReceivedItemsSince,
  completeShipment,
  deleteShipment,
  supabase, // Export for potential direct use
};
