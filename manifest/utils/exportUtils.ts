import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ReceivedItem } from "../types/shipment";

/**
 * Combines items with duplicate item numbers across different document IDs.
 * Sums up expected quantities, received quantities, and recalculates discrepancy.
 */
export function combineItemsByItemNumber(items: ReceivedItem[]): ReceivedItem[] {
  const itemMap = new Map<string, ReceivedItem>();

  items.forEach((item) => {
    const key = item.itemNumber;

    if (itemMap.has(key)) {
      // Item number already exists - combine quantities
      const existing = itemMap.get(key)!;
      existing.qtyExpected += item.qtyExpected;
      existing.qtyReceived += item.qtyReceived;
      existing.discrepancy = existing.qtyReceived - existing.qtyExpected;
    } else {
      // First occurrence of this item number - create a copy without documentId
      itemMap.set(key, {
        ...item,
        documentId: undefined, // Remove documentId since we're combining across docs
      });
    }
  });

  return Array.from(itemMap.values());
}

export function itemsToCSV(items: ReceivedItem[]): string {
  const headers = [
    "Item Number",
    "Legacy Item Number",
    "Description",
    "UPC",
    "Qty Expected",
    "Qty Received",
    "Discrepancy",
  ];

  const rows = items.map((item) => [
    item.itemNumber,
    item.legacyItemNumber || "",
    item.description,
    item.upc,
    item.qtyExpected.toString(),
    item.qtyReceived.toString(),
    item.discrepancy.toString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export async function exportReceivedItems(
  items: ReceivedItem[],
  filename: string = "received_items.csv"
): Promise<boolean> {
  try {
    // Export all line items individually without combining
    const csvContent = itemsToCSV(items);
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      // Note: Expo Sharing API doesn't provide a way to detect if user cancelled the share dialog
      // This is a known limitation (see: https://github.com/expo/expo/issues/5713)
      // We return true if the share dialog was shown, regardless of user action
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error exporting items:", error);
    return false;
  }
}

/**
 * Export only items with discrepancies
 * Exports all line items individually without combining
 */
export async function exportDiscrepancies(
  items: ReceivedItem[],
  filename: string = "discrepancies.csv"
): Promise<boolean> {
  // Filter for discrepancies without combining
  const itemsWithDiscrepancies = items.filter((item) => item.discrepancy !== 0);

  try {
    const csvContent = itemsToCSV(itemsWithDiscrepancies);
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error exporting discrepancies:", error);
    return false;
  }
}

/**
 * Export items with overages only
 * Exports all line items individually without combining
 */
export async function exportOverages(
  items: ReceivedItem[],
  filename: string = "overages.csv"
): Promise<boolean> {
  // Filter for overages without combining
  const overages = items.filter((item) => item.discrepancy > 0);

  try {
    const csvContent = itemsToCSV(overages);
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error exporting overages:", error);
    return false;
  }
}

/**
 * Export items with shortages only
 * Exports all line items individually without combining
 */
export async function exportShortages(
  items: ReceivedItem[],
  filename: string = "shortages.csv"
): Promise<boolean> {
  // Filter for shortages without combining
  const shortages = items.filter((item) => item.discrepancy < 0);

  try {
    const csvContent = itemsToCSV(shortages);
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error exporting shortages:", error);
    return false;
  }
}
