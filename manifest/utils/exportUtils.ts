import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ReceivedItem } from "../types/shipment";

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
      console.log("Sharing is not available on this device");
      return false;
    }
  } catch (error) {
    console.error("Error exporting items:", error);
    return false;
  }
}

/**
 * Export only items with discrepancies
 */
export async function exportDiscrepancies(
  items: ReceivedItem[],
  filename: string = "discrepancies.csv"
): Promise<boolean> {
  const itemsWithDiscrepancies = items.filter((item) => item.discrepancy !== 0);
  return exportReceivedItems(itemsWithDiscrepancies, filename);
}

/**
 * Export items with overages only
 */
export async function exportOverages(
  items: ReceivedItem[],
  filename: string = "overages.csv"
): Promise<boolean> {
  const overages = items.filter((item) => item.discrepancy > 0);
  return exportReceivedItems(overages, filename);
}

export async function exportShortages(
  items: ReceivedItem[],
  filename: string = "shortages.csv"
): Promise<boolean> {
  const shortages = items.filter((item) => item.discrepancy < 0);
  return exportReceivedItems(shortages, filename);
}
