# Shipment Receiving App - Project Summary

## Overview
A complete mobile application for receiving truck shipments, built with React Native and Expo SDK 54. The app enables warehouse staff to efficiently track expected items, scan barcodes, record received quantities, and identify discrepancies in real-time.

## Project Structure

```
manifest/
├── app/                          # Expo Router screens (navigation)
│   ├── _layout.tsx              # Root layout with Redux & persistence
│   ├── index.tsx                # Home screen with shipment overview
│   ├── history.tsx              # Completed shipments with stats
│   ├── new-shipment.tsx         # PDF upload & item entry
│   ├── scan-items.tsx           # Barcode scanner & search
│   └── received-items.tsx       # Review, edit & export
│
├── store/                        # Redux Toolkit state management
│   ├── store.ts                 # Configure store & persistence
│   └── shipmentSlice.ts         # Shipment actions & reducers
│
├── types/                        # TypeScript type definitions
│   └── shipment.ts              # Core data types
│
├── utils/                        # Utility functions
│   ├── pdfParser.ts             # PDF table extraction
│   └── exportUtils.ts           # CSV export functionality
│
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── README.md                     # User documentation
```

## Key Features Implemented

### 1. Shipment Management
- ✅ Create new shipments
- ✅ View active shipment status
- ✅ Browse shipment history
- ✅ Delete old shipments
- ✅ Persistent storage with AsyncStorage

### 2. PDF Processing
- ✅ PDF upload via expo-document-picker
- ✅ Table extraction framework (requires backend for production)
- ✅ Demo data for testing
- ✅ Manual item entry/editing
- ✅ Document ID tracking (Fiori integration ready)

### 3. Item Receiving
- ✅ Barcode scanning with expo-barcode-scanner
- ✅ Real-time UPC lookup
- ✅ Flexible search (UPC, item number, description)
- ✅ Keyword filtering (substring matching)
- ✅ Quantity input & validation
- ✅ Cumulative quantity tracking

### 4. Discrepancy Detection
- ✅ Automatic calculation (received - expected)
- ✅ Visual indicators (overages, shortages, matches)
- ✅ Real-time updates
- ✅ Editable received quantities
- ✅ Summary statistics dashboard

### 5. Data Export
- ✅ Export all received items (CSV)
- ✅ Export discrepancies only
- ✅ Export overages only
- ✅ Export shortages only
- ✅ Share via native share menu

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo SDK 54** | Development platform & native modules |
| **Expo Router** | File-based navigation system |
| **Redux Toolkit** | Centralized state management |
| **AsyncStorage** | Local data persistence |
| **TypeScript** | Type-safe development |
| **expo-barcode-scanner** | UPC/barcode scanning |
| **expo-camera** | Camera access for scanning |
| **expo-document-picker** | PDF file selection |
| **expo-file-system** | File I/O operations |
| **expo-sharing** | Native share functionality |

## Data Flow

```
1. START NEW SHIPMENT
   ↓
   Upload PDF or Enter Items Manually
   ↓
   Store Expected Items in Redux
   ↓
   Save to AsyncStorage

2. SCAN/SEARCH ITEMS
   ↓
   Barcode Scanner / Search Input
   ↓
   Match UPC with Expected Items
   ↓
   Enter Quantity Received
   ↓
   Calculate Discrepancy (received - expected)
   ↓
   Add to Received Items Array
   ↓
   Update Redux State & AsyncStorage

3. REVIEW & EXPORT
   ↓
   View All Received Items
   ↓
   Filter by Discrepancy Type
   ↓
   Export to CSV
   ↓
   Share via Email/Cloud/etc.

4. COMPLETE SHIPMENT
   ↓
   Mark as Completed
   ↓
   Move to History
   ↓
   Clear Active Shipment
```

## Core Data Types

### ExpectedItem
```typescript
{
  itemNumber: string;           // Primary identifier
  legacyItemNumber?: string;    // Optional legacy ID
  description: string;          // Item name
  upc: string;                  // UPC barcode
  qtyExpected: number;          // Expected quantity from PO
}
```

### ReceivedItem
```typescript
{
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyReceived: number;          // Actual quantity scanned
  qtyExpected: number;          // From expected items
  discrepancy: number;          // Overage/shortage amount
                                // (+) = overage
                                // (-) = shortage
                                // (0) = perfect match
}
```

### Shipment
```typescript
{
  id: string;                   // Unique identifier
  date: string;                 // YYYY-MM-DD format
  documentIds: string[];        // Fiori document references
  expectedItems: ExpectedItem[];
  receivedItems: ReceivedItem[];
  status: 'in-progress' | 'completed';
  createdAt: number;            // Unix timestamp
  completedAt?: number;         // Unix timestamp (when completed)
}
```

## User Workflows

### Workflow A: PDF Upload Path
1. Tap "Start New Shipment"
2. Tap "Select PDF File"
3. Choose purchase order PDF
4. Review auto-extracted items (or use demo data)
5. Add/edit document IDs
6. Tap "Start Receiving Items"
7. Scan barcodes or search manually
8. Enter quantities for each item
9. Review received items table
10. Export CSV if needed
11. Complete shipment

### Workflow B: Manual Entry Path
1. Tap "Start New Shipment"
2. Tap "Use Demo Data" or manually add items
3. Enter item details (number, description, UPC, qty)
4. Add document IDs
5. Tap "Start Receiving Items"
6. [Continue same as Workflow A from step 7]

### Workflow C: Quick Scan Path
1. Continue active shipment from home screen
2. Tap "Continue Scanning"
3. Tap "Scan Barcode"
4. Point camera at UPC
5. Enter quantity when item found
6. Repeat for all items
7. Tap "View Received" to review
8. Complete or continue scanning

## Barcode Scanner Details

**Supported Barcode Types:**
- UPC-A
- UPC-E
- EAN-13
- EAN-8
- Code 128
- Code 39

**Scanner Features:**
- Real-time camera preview
- Auto-detection when barcode is in view
- Match against expected items instantly
- Fallback to manual search if scan fails

## Search & Filter System

The search functionality uses **substring matching**:
- Search "456" finds UPC "123456789012"
- Search "apple" finds "Red Delicious Apple"
- Search "item" finds item number "ITEM-001"
- Case-insensitive matching
- Real-time filtering as you type

## Export Format Details

**CSV Column Headers:**
```
Item Number, Legacy Item Number, Description, UPC, Qty Expected, Qty Received, Discrepancy
```

**Example CSV Row:**
```csv
"12345","67890","Sample Product A","123456789012","100","105","5"
```

**Export Types:**
1. **All Items** - Complete list of scanned items
2. **Discrepancies** - Only items where qty received ≠ qty expected
3. **Overages** - Only items where qty received > qty expected
4. **Shortages** - Only items where qty received < qty expected

## Known Limitations & Future Work

### Current Limitations
1. **PDF Parsing**: Basic framework only - requires backend service for production
2. **Offline Only**: No cloud sync or multi-device support
3. **No Photos**: Can't attach images of damaged items
4. **No Signatures**: No signature capture for shipment completion
5. **Single User**: No authentication or user management

### Recommended Enhancements
1. **Backend Integration**
   - AWS Textract or Google Document AI for PDF parsing
   - Cloud database (Supabase, Firebase) for sync
   - API for Fiori system integration

2. **Advanced Features**
   - Photo attachments for damaged items
   - Signature capture on completion
   - Bluetooth barcode scanner support
   - Voice input for quantity
   - Batch scanning mode
   - Print labels/receipts

3. **Reporting & Analytics**
   - Receiving time metrics
   - Discrepancy trends
   - Item-level history
   - Performance dashboards

4. **User Management**
   - Multi-user support
   - Role-based access control
   - Audit logs
   - User performance tracking

## Getting Started

### Installation
```bash
cd manifest
npm install
npm start
```

### Testing with Demo Data
1. Start the app
2. Tap "Start New Shipment"
3. Tap "Use Demo Data for Testing"
4. Demo items will load with sample UPCs
5. Practice scanning or searching

### Building for Production
```bash
# Android
expo build:android

# iOS (requires Mac & Apple Developer account)
expo build:ios
```

## Security Considerations

1. **PDF Storage**: PDFs are NOT stored per requirements - only extracted data
2. **Local Storage**: All data stored in AsyncStorage (device-only)
3. **Permissions**: Only camera & file access permissions requested
4. **No Network**: App works 100% offline - no data transmitted

## Performance Notes

- **State Management**: Redux Toolkit with persistence middleware
- **Re-renders**: Optimized with proper React hooks usage
- **Storage**: AsyncStorage writes debounced to prevent excessive I/O
- **Search**: Client-side filtering - no network latency
- **Scanner**: Native camera module for best performance

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Camera won't open | Check app permissions in device settings |
| Barcode not scanning | Ensure good lighting & focus |
| PDF upload fails | Use demo data or manual entry |
| Export not working | Verify share functionality enabled |
| Data not persisting | Check AsyncStorage permissions |
| Search not finding items | Try different search terms |

## Development Notes

- **Hot Reload**: Enabled - changes reflect instantly
- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Not configured (can be added)
- **Testing**: No tests yet (Jest can be added)
- **CI/CD**: Not configured (GitHub Actions recommended)

## File Naming Conventions

- **Screens**: kebab-case (`new-shipment.tsx`)
- **Components**: PascalCase (future: `ItemCard.tsx`)
- **Utils**: camelCase (`exportUtils.ts`)
- **Types**: camelCase (`shipment.ts`)
- **Constants**: UPPER_CASE (future: `CONSTANTS.ts`)

## Version History

- **v1.0.0** (Current)
  - Initial release
  - Core receiving functionality
  - Barcode scanning
  - CSV export
  - Local persistence

---

**Built with ❤️ using Expo & React Native**

For questions or issues, refer to [README.md](README.md)
