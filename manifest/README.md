# Shipment Receiving App

A React Native mobile app built with Expo SDK 54 for receiving items from truck shipments. The app allows users to track expected items, scan barcodes, record received quantities, and identify discrepancies.

## Features

- **Shipment Management**: Create new shipments and view history
- **PDF Upload**: Upload purchase order PDFs containing expected items (with demo data option)
- **Barcode Scanning**: Scan UPC barcodes to quickly identify items
- **Manual Search**: Filter and search items by UPC, item number, or description
- **Discrepancy Tracking**: Automatically calculate overages and shortages
- **Data Export**: Export received items, discrepancies, overages, or shortages as CSV
- **Persistent Storage**: All shipment data is saved locally using AsyncStorage

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the project directory:
```bash
cd manifest
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Running on Specific Platforms

```bash
# Android
npm run android

# iOS (requires macOS)
npm run ios

# Web
npm run web
```

## Usage Guide

### 1. Starting a New Shipment

1. Tap **"Start New Shipment"** on the home screen
2. Upload a PDF with purchase order information OR use demo data for testing
3. The app will attempt to extract:
   - Document IDs (Fiori document numbers)
   - Item details (Item Number, Legacy Item Number, Description, UPC, Expected Quantity)
4. Review and edit the expected items as needed
5. Add any additional document IDs manually
6. Tap **"Start Receiving Items"**

### 2. Scanning Items

1. Tap **"📷 Scan Barcode"** to open the camera scanner
2. Point the camera at a UPC barcode
3. The app will automatically find the item if it matches expected items
4. Enter the quantity received
5. Tap **"Add to Received"**

**Alternative: Manual Search**
- Type a UPC, item number, or description in the search box
- The app will filter items containing your search term
- Select the matching item
- Enter quantity and add to received

### 3. Reviewing Received Items

1. Tap **"View Received"** to see all scanned items
2. The app displays:
   - **Expected Quantity**: From the purchase order
   - **Received Quantity**: What you've scanned
   - **Discrepancy**: Difference (positive = overage, negative = shortage)
3. Edit quantities by tapping **"Edit"** on any item

### 4. Exporting Data

From the Received Items screen, you can export:
- **All Items**: Complete list of received items
- **Discrepancies Only**: Items with overages or shortages
- **Overages Only**: Items received in excess
- **Shortages Only**: Items with insufficient quantity

The app will create a CSV file and share it via your device's share menu.

### 5. Completing a Shipment

1. Review all received items
2. Tap **"Complete Shipment"**
3. The shipment is saved to history and removed from active status
4. View completed shipments in **"Shipment History"**

## App Structure

```
manifest/
├── app/                      # Expo Router screens
│   ├── _layout.tsx          # Root layout with Redux provider
│   ├── index.tsx            # Home screen
│   ├── history.tsx          # Shipment history
│   ├── new-shipment.tsx     # Create new shipment
│   ├── scan-items.tsx       # Barcode scanning/search
│   └── received-items.tsx   # Review and export
├── store/                   # Redux state management
│   ├── store.ts            # Store configuration
│   └── shipmentSlice.ts    # Shipment reducer
├── types/                   # TypeScript types
│   └── shipment.ts         # Shipment data types
├── utils/                   # Utility functions
│   ├── pdfParser.ts        # PDF extraction logic
│   └── exportUtils.ts      # CSV export functions
└── components/             # Reusable components (future)
```

## Data Schema

### Expected Item
```typescript
{
  itemNumber: string;           // Primary item identifier
  legacyItemNumber?: string;    // Optional legacy identifier
  description: string;          // Item description
  upc: string;                  // UPC barcode
  qtyExpected: number;          // Expected quantity
}
```

### Received Item
```typescript
{
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyReceived: number;          // Actual quantity received
  qtyExpected: number;          // Expected quantity
  discrepancy: number;          // qtyReceived - qtyExpected
}
```

## PDF Parsing Notes

The app includes basic PDF parsing logic, but for production use, you should implement a backend service for robust table extraction:

**Recommended Services:**
- AWS Textract
- Google Document AI
- Adobe PDF Services API
- Azure Form Recognizer

The current implementation provides demo data for testing purposes.

## Camera Permissions

The app requires camera permissions for barcode scanning:
- **Android**: Automatically requested on first use
- **iOS**: Add camera usage description in app.json

## Data Persistence

All shipment data is stored locally using AsyncStorage:
- Shipments are automatically saved after each action
- Data persists between app restarts
- No internet connection required

## Export Format

CSV exports include the following columns:
- Item Number
- Legacy Item Number
- Description
- UPC
- Qty Expected
- Qty Received
- Discrepancy

## Troubleshooting

### Barcode scanner not working
- Ensure camera permissions are granted
- Try better lighting conditions
- Make sure barcode is in focus

### PDF upload not extracting data
- Use the demo data option for testing
- Implement a backend PDF parsing service for production

### Export not working
- Check that sharing is enabled on your device
- Try exporting to a different app

## Future Enhancements

- Cloud sync for multi-device access
- Backend PDF parsing integration
- Photo attachment for damaged items
- Signature capture for shipment completion
- Offline-first sync capability
- Advanced reporting and analytics
- Bluetooth barcode scanner support

## Tech Stack

- **React Native**: Mobile framework
- **Expo SDK 54**: Development platform
- **Expo Router**: File-based navigation
- **Redux Toolkit**: State management
- **AsyncStorage**: Local persistence
- **expo-barcode-scanner**: Barcode scanning
- **expo-document-picker**: PDF upload
- **expo-sharing**: Data export

## License

This project is provided as-is for internal use.
