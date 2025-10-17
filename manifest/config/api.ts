/**
 * API Configuration
 *
 * Choose your backend:
 * - Local: http://localhost:3000/api/parse-pdf
 * - Vercel: https://your-project.vercel.app/api/parse-pdf
 * - Custom: Your deployed backend URL
 */

export const API_CONFIG = {
  // ngrok tunnel - REPLACE with your actual ngrok URL after running `ngrok http 3000`
  PDF_PARSER_URL:
    "https://overcommunicative-onerously-willia.ngrok-free.dev/api/parse-pdf",

  // Or deployed backend on Render
  // PDF_PARSER_URL: 'https://your-app-name.onrender.com/api/parse-pdf',

  // Or leave empty to use demo data only
  // PDF_PARSER_URL: '',

  // Optional: Add API key if you enable authentication
  API_KEY: "",
};

// Check if PDF parsing is enabled
export const isPdfParsingEnabled = () => {
  return API_CONFIG.PDF_PARSER_URL !== "";
};
