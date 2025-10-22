import { ExpectedItem } from "../types/shipment";
import { API_CONFIG, isPdfParsingEnabled } from "../config/api";

/**
 * Main function to parse PDF file
 *
 * Sends PDF to the Node.js backend API for parsing.
 * If API is not configured, returns an error prompting to start the backend.
 */
export async function parsePdfFile(uri: string): Promise<{
  documentIds: string[];
  expectedItems: ExpectedItem[];
  error?: string;
}> {
  try {
    // Check if PDF parsing API is configured
    if (!isPdfParsingEnabled()) {
      return {
        documentIds: [],
        expectedItems: [],
        error:
          "PDF parsing not configured. Start the backend server (node server.js) and update config/api.ts with the API URL.",
      };
    }

    // Read PDF file as base64 using modern File API
    const file = await fetch(uri);
    const blob = await file.blob();
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data:application/pdf;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Get filename from URI
    const fileName = uri.split("/").pop() || "document.pdf";

    // Call Node.js backend API
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if configured
    if (API_CONFIG.API_KEY) {
      headers["x-api-key"] = API_CONFIG.API_KEY;
    }

    const response = await fetch(API_CONFIG.PDF_PARSER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileContent,
        fileName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API returned ${response.status}`);
    }

    const result = await response.json();
    console.log('📦 Parse PDF Result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.message || "Failed to parse PDF");
    }

    // Map qtyShipped to qtyExpected for the expected items
    const expectedItems = result.data.expectedItems.map((item: any) => ({
      itemNumber: item.itemNumber,
      legacyItemNumber: item.legacyNumber,
      description: item.description,
      upc: item.upc,
      qtyExpected: item.qtyShipped, // Backend uses qtyShipped, frontend expects qtyExpected
      documentId: item.documentId, // Include document ID from page-by-page parsing
    }));

    console.log('✅ Parsed Items:', expectedItems.length);
    console.log('📄 Document IDs:', result.data.packingLists);

    return {
      documentIds: result.data.packingLists || [],
      expectedItems: expectedItems,
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return {
      documentIds: [],
      expectedItems: [],
      error: error instanceof Error ? error.message : "Failed to parse PDF",
    };
  }
}

/**
 * Helper function for demo/testing purposes
 * Allows users to test the app without PDF parsing backend
 */
export function createMockExpectedItems(): ExpectedItem[] {
  const timestamp = Date.now().toString().slice(-6);
  const doc1 = `12345${timestamp.slice(0, 3)}`;
  const doc2 = `12345${timestamp.slice(3, 6)}`;

  return [
    {
      itemNumber: "ITEM-001",
      legacyItemNumber: "LEG-001",
      description: "Wireless Mouse - Black",
      upc: "012345678901",
      qtyExpected: 100,
      documentId: doc1,
    },
    {
      itemNumber: "ITEM-002",
      legacyItemNumber: "LEG-002",
      description: "USB-C Cable 6ft",
      upc: "012345678902",
      qtyExpected: 200,
      documentId: doc1,
    },
    {
      itemNumber: "ITEM-003",
      legacyItemNumber: "LEG-003",
      description: "Keyboard Wireless RGB",
      upc: "012345678903",
      qtyExpected: 75,
      documentId: doc1,
    },
    {
      itemNumber: "ITEM-004",
      description: "Laptop Stand Aluminum",
      upc: "012345678904",
      qtyExpected: 50,
      documentId: doc2,
    },
    {
      itemNumber: "ITEM-005",
      legacyItemNumber: "LEG-005",
      description: "Webcam HD 1080p",
      upc: "012345678905",
      qtyExpected: 150,
      documentId: doc2,
    },
    {
      itemNumber: "ITEM-006",
      description: 'Monitor 27" 4K',
      upc: "012345678906",
      qtyExpected: 30,
      documentId: doc2,
    },
    {
      itemNumber: "ITEM-007",
      legacyItemNumber: "LEG-007",
      description: "Desk Lamp LED",
      upc: "012345678907",
      qtyExpected: 120,
      documentId: doc2,
    },
    {
      itemNumber: "ITEM-008",
      description: "Phone Charger Fast 20W",
      upc: "012345678908",
      qtyExpected: 300,
      documentId: doc2,
    },
  ];
}

/**
 * Generate demo document IDs with timestamp
 */
export function createMockDocumentIds(): string[] {
  const timestamp = Date.now().toString().slice(-6);
  return [`PO-${timestamp}`, `DOC-${parseInt(timestamp) + 1}`];
}
