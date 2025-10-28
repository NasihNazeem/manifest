const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env file"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function saveShipment(shipmentId, shipmentData) {
  try {
    const { data, error } = await supabase.from("shipments").upsert(
      {
        id: shipmentId,
        date: shipmentData.date,
        document_ids: shipmentData.documentIds,
        expected_items: shipmentData.expectedItems,
        status: shipmentData.status || "in-progress",
        created_at: shipmentData.createdAt,
        completed_at: shipmentData.completedAt || null,
        last_updated: Date.now(),
      },
      {
        onConflict: "id",
      }
    );

    if (error) {
      console.error("Error saving shipment:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveShipment:", error);
    return false;
  }
}

// Get shipment by ID
async function getShipment(shipmentId) {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Error getting shipment:", error);
      return null;
    }

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
    console.error("Error in getShipment:", error);
    return null;
  }
}

async function getAllShipments() {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting all shipments:", error);
      return [];
    }

    return data.map((shipment) => ({
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
    console.error("Error in getAllShipments:", error);
    return [];
  }
}

async function addReceivedItem(shipmentId, upc, qtyReceived, deviceId) {
  try {
    const shipment = await getShipment(shipmentId);
    if (!shipment) {
      return { success: false, error: "Shipment not found" };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("received_items")
      .select("*")
      .eq("shipment_id", shipmentId)
      .eq("upc", upc)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking existing item:", fetchError);
      return { success: false, error: fetchError.message };
    }

    let result;

    if (existing) {
      const newQty = existing.qty_received + qtyReceived;
      const scannedBy = existing.scanned_by || [];

      if (!scannedBy.includes(deviceId)) {
        scannedBy.push(deviceId);
      }

      const { data, error } = await supabase
        .from("received_items")
        .update({
          qty_received: newQty,
          scanned_by: scannedBy,
          last_updated: Date.now(),
        })
        .eq("shipment_id", shipmentId)
        .eq("upc", upc)
        .select()
        .single();

      if (error) {
        console.error("Error updating received item:", error);
        return { success: false, error: error.message };
      }

      result = data;
    } else {
      const { data, error } = await supabase
        .from("received_items")
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
        console.error("Error creating received item:", error);
        return { success: false, error: error.message };
      }

      result = data;
    }

    return {
      success: true,
      item: {
        upc: result.upc,
        qtyReceived: result.qty_received,
        scannedBy: result.scanned_by,
        lastUpdated: result.last_updated,
      },
    };
  } catch (error) {
    console.error("Error in addReceivedItem:", error);
    return { success: false, error: error.message };
  }
}

async function getReceivedItems(shipmentId) {
  try {
    const { data, error } = await supabase
      .from("received_items")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error getting received items:", error);
      return [];
    }

    return data.map((item) => ({
      upc: item.upc,
      qtyReceived: item.qty_received,
      scannedBy: item.scanned_by,
      lastUpdated: item.last_updated,
    }));
  } catch (error) {
    console.error("Error in getReceivedItems:", error);
    return [];
  }
}

async function getReceivedItemsSince(shipmentId, timestamp) {
  try {
    const { data, error } = await supabase
      .from("received_items")
      .select("*")
      .eq("shipment_id", shipmentId)
      .gt("last_updated", timestamp)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error getting received items since timestamp:", error);
      return [];
    }

    return data.map((item) => ({
      upc: item.upc,
      qtyReceived: item.qty_received,
      scannedBy: item.scanned_by,
      lastUpdated: item.last_updated,
    }));
  } catch (error) {
    console.error("Error in getReceivedItemsSince:", error);
    return [];
  }
}

async function completeShipment(shipmentId) {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .update({
        status: "completed",
        completed_at: Date.now(),
        last_updated: Date.now(),
      })
      .eq("id", shipmentId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Shipment not found" };
      }
      console.error("Error completing shipment:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in completeShipment:", error);
    return { success: false, error: error.message };
  }
}

async function deleteShipment(shipmentId) {
  try {
    const { error } = await supabase
      .from("shipments")
      .delete()
      .eq("id", shipmentId);

    if (error) {
      console.error("Error deleting shipment:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteShipment:", error);
    return { success: false, error: error.message };
  }
}

async function getUserByUsername(username) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error getting user:", error);
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      passcodeHash: data.passcode_hash,
      name: data.name,
      isTempPasscode: data.is_temp_passcode,
      isActive: data.is_active,
      createdAt: data.created_at,
      lastLogin: data.last_login,
    };
  } catch (error) {
    console.error("Error in getUserByUsername:", error);
    return null;
  }
}

async function updateLastLogin(userId) {
  try {
    const { error } = await supabase
      .from("users")
      .update({ last_login: Date.now() })
      .eq("id", userId);

    if (error) {
      console.error("Error updating last login:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateLastLogin:", error);
    return false;
  }
}

async function changePasscode(userId, newPasscodeHash) {
  try {
    const { error } = await supabase
      .from("users")
      .update({
        passcode_hash: newPasscodeHash,
        is_temp_passcode: false,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error changing passcode:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in changePasscode:", error);
    return { success: false, error: error.message };
  }
}

async function createSession(userId) {
  try {
    const crypto = require("crypto");
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return null;
    }

    return {
      sessionToken: data.session_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("Error in createSession:", error);
    return null;
  }
}

async function validateSession(sessionToken) {
  try {
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*, users(*)")
      .eq("session_token", sessionToken)
      .gt("expires_at", Date.now())
      .single();

    if (sessionError || !session) {
      return null;
    }

    await supabase
      .from("sessions")
      .update({ last_active: Date.now() })
      .eq("session_token", sessionToken);

    return {
      sessionId: session.id,
      userId: session.user_id,
      user: {
        id: session.users.id,
        username: session.users.username,
        name: session.users.name,
        isTempPasscode: session.users.is_temp_passcode,
        isActive: session.users.is_active,
      },
    };
  } catch (error) {
    console.error("Error in validateSession:", error);
    return null;
  }
}

async function deleteSession(sessionToken) {
  try {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("session_token", sessionToken);

    if (error) {
      console.error("Error deleting session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteSession:", error);
    return false;
  }
}

async function deleteAllUserSessions(userId) {
  try {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting user sessions:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteAllUserSessions:", error);
    return false;
  }
}

async function cleanupExpiredSessions() {
  try {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .lt("expires_at", Date.now());

    if (error) {
      console.error("Error cleaning up sessions:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in cleanupExpiredSessions:", error);
    return false;
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
  getUserByUsername,
  updateLastLogin,
  changePasscode,
  createSession,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  cleanupExpiredSessions,
  supabase, // Export for potential direct use
};
