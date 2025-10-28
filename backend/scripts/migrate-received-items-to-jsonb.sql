-- Migration: Store received items as JSONB in shipments table to minimize database writes
-- This reduces 100s of individual row writes to a single UPDATE per batch upload

-- Step 1: Add JSONB column to shipments table
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS received_items_data JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing received_items data to JSONB format (if any exists)
-- This query aggregates all received items per shipment into a single JSONB array
UPDATE shipments s
SET received_items_data = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'upc', ri.upc,
      'qtyReceived', ri.qty_received,
      'qtyExpected', ri.qty_expected,
      'itemNumber', ri.item_number,
      'legacyItemNumber', ri.legacy_item_number,
      'description', ri.description,
      'documentId', ri.document_id,
      'scannedBy', ri.scanned_by,
      'scannedByUsername', ri.scanned_by_username,
      'scannedByName', ri.scanned_by_name,
      'scannedAt', ri.last_updated
    )
  ), '[]'::jsonb)
  FROM received_items ri
  WHERE ri.shipment_id = s.id
);

-- Step 3: Create GIN index for fast JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_shipments_received_items_gin
ON shipments USING gin(received_items_data);

-- Step 4: Keep received_items table for now (for backwards compatibility)
-- You can drop it later after confirming the migration worked:
-- DROP TABLE received_items;

-- Note: With this approach:
-- - Each batch upload = 1 UPDATE query (vs 100s of INSERT/UPDATE queries)
-- - Significantly reduces database write costs
-- - JSONB is indexed and queryable
-- - All shipment data stays together for better locality
