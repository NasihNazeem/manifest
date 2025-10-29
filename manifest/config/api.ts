// Get environment variables
// EXPO_PUBLIC_ prefix makes them available in the app
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

export const API_CONFIG = {
  // PDF Parser endpoint - built from base URL
  PDF_PARSER_URL: `${API_BASE_URL}/api/parse-pdf`,

  // Base URL for other endpoints
  BASE_URL: API_BASE_URL,

  // Optional: Add API key if you enable authentication
  API_KEY: API_KEY,
};

// Check if PDF parsing is enabled
export const isPdfParsingEnabled = () => {
  return API_CONFIG.PDF_PARSER_URL !== "";
};
