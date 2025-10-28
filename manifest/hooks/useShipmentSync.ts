import { useEffect } from 'react';
import { useAppDispatch } from '../store/store';
import { loadShipmentsFromServer } from '../store/shipmentSlice';
import { fetchAllShipments } from '../services/syncService';

/**
 * Hook to sync completed shipments from server on app start
 * This ensures that shipments completed on other devices or
 * lost due to cache clear are restored from the server
 */
export function useShipmentSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const syncShipments = async () => {
      console.log('🔄 Syncing shipments from server...');

      const result = await fetchAllShipments();

      if (result.success && result.shipments) {
        // Transform server data to match our local format
        const transformedShipments = result.shipments.map((s: any) => ({
          id: s.id,
          date: s.date,
          documentIds: s.documentIds,
          expectedItems: s.expectedItems || [],
          receivedItems: [], // Received items are loaded separately if needed
          status: s.status,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
        }));

        dispatch(loadShipmentsFromServer(transformedShipments));
        console.log('✅ Shipments synced successfully');
      } else {
        console.log('⚠️  Failed to sync shipments:', result.error);
        // Don't show error to user - app works without sync
      }
    };

    // Run sync after a short delay to let auth initialize first
    const timer = setTimeout(syncShipments, 1000);

    return () => clearTimeout(timer);
  }, [dispatch]);
}
