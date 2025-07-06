// Netlify Function for Google Sheets API with Mock Data Support
// This function handles all API calls and provides mock data in development

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Mock data - same as in googleSheets.ts
const mockData = {
  inventory: [
    {
      id: "INV-001",
      category: "cartridge",
      brand: "HP",
      model: "HP 564XL",
      type: "Black",
      stockQuantity: 15,
      reorderLevel: 5,
      costPrice: 18.99,
      sellPrice: 35.99,
      supplier: "Cartridge World",
      lastUpdated: "2024-01-15",
      notes: "Popular item"
    },
    // ... more mock data
  ],
  cartridges: [
    {
      id: "CART-001",
      customerName: "John Smith",
      customerPhone: "403-555-0123",
      customerEmail: "john.smith@email.com",
      cartridgeType: "HP 564XL Black",
      quantity: 2,
      status: "received",
      dateReceived: "2024-01-18",
      estimatedCompletion: "2024-01-20",
      notes: "Customer wants expedited service"
    },
    // ... more mock data
  ],
  receipts: [],
  notes: [],
  stickyNotes: [],
  blogPosts: [
    {
      id: "BLOG-001",
      title: "Welcome to Our New Website!",
      content: "We're excited to announce our new online presence with enhanced features for better customer service.",
      excerpt: "Check out our new website with enhanced features",
      status: "published",
      publishDate: "2024-01-15",
      author: "Staff",
      tags: ["announcement", "website"]
    }
  ]
};

// Google Sheets API configuration
interface GoogleSheetsConfig {
  spreadsheetId: string;
  apiKey: string;
}

const getGoogleSheetsConfig = (): GoogleSheetsConfig => {
  return {
    spreadsheetId: process.env.GOOGLE_SHEETS_ID || 'mock-sheet-id',
    apiKey: process.env.GOOGLE_SHEETS_API_KEY || 'mock-api-key'
  };
};

// Check if we're in development mode
const isDevMode = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         process.env.NETLIFY_DEV === 'true' ||
         !process.env.GOOGLE_SHEETS_API_KEY;
};

// Simulate API delay for realistic experience
const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Convert Google Sheets array format to objects
const convertSheetsDataToObjects = (values: string[][]): any[] => {
  if (!values || values.length === 0) return [];
  
  const [headers, ...rows] = values;
  return rows.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};

// Get data from Google Sheets or mock data
const getData = async (tableName: string): Promise<any[]> => {
  if (isDevMode()) {
    await simulateDelay();
    return JSON.parse(JSON.stringify((mockData as any)[tableName] || []));
  }

  try {
    const config = getGoogleSheetsConfig();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${tableName}!A1:Z1000?key=${config.apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return convertSheetsDataToObjects(data.values);
  } catch (error) {
    console.error('Google Sheets API error:', error);
    // Fallback to mock data if API fails
    return JSON.parse(JSON.stringify((mockData as any)[tableName] || []));
  }
};

// Add data to Google Sheets or mock storage
const addData = async (tableName: string, data: any): Promise<any> => {
  if (isDevMode()) {
    await simulateDelay();
    const newRecord = {
      ...data,
      id: data.id || `${tableName.toUpperCase()}-${Date.now()}`,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In real implementation, this would persist to a database
    // For now, we'll just return the new record
    return newRecord;
  }

  try {
    const config = getGoogleSheetsConfig();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${tableName}!A1:append?valueInputOption=RAW&key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [Object.values(data)]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to add data: ${response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.error('Failed to add data to Google Sheets:', error);
    throw error;
  }
};

// Update data in Google Sheets or mock storage
const updateData = async (tableName: string, id: string, data: any): Promise<any> => {
  if (isDevMode()) {
    await simulateDelay();
    return {
      ...data,
      id,
      updatedAt: new Date().toISOString()
    };
  }

  try {
    // In production, this would find and update the specific row
    // Implementation depends on your Google Sheets structure
    console.log('Updating Google Sheets record:', { tableName, id, data });
    return { ...data, id, updatedAt: new Date().toISOString() };
  } catch (error) {
    console.error('Failed to update data in Google Sheets:', error);
    throw error;
  }
};

// Delete data from Google Sheets or mock storage
const deleteData = async (tableName: string, id: string): Promise<boolean> => {
  if (isDevMode()) {
    await simulateDelay();
    return true;
  }

  try {
    // In production, this would find and delete the specific row
    console.log('Deleting from Google Sheets:', { tableName, id });
    return true;
  } catch (error) {
    console.error('Failed to delete from Google Sheets:', error);
    return false;
  }
};

// Main handler function
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  try {
    const { httpMethod, path, body } = event;
    const pathParts = path.split('/').filter(Boolean);
    
    // Remove 'api' from the path if present
    const apiIndex = pathParts.indexOf('api');
    if (apiIndex !== -1) {
      pathParts.splice(apiIndex, 1);
    }

    const [tableName, id] = pathParts;

    if (!tableName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Table name is required" })
      };
    }

    let responseData;

    switch (httpMethod) {
      case "GET":
        responseData = await getData(tableName);
        break;

      case "POST":
        if (!body) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Request body is required" })
          };
        }
        const newData = JSON.parse(body);
        responseData = await addData(tableName, newData);
        break;

      case "PUT":
        if (!id || !body) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "ID and request body are required" })
          };
        }
        const updateDataPayload = JSON.parse(body);
        responseData = await updateData(tableName, id, updateDataPayload);
        break;

      case "DELETE":
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "ID is required" })
          };
        }
        responseData = await deleteData(tableName, id);
        break;

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: "Method not allowed" })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        devMode: isDevMode()
      })
    };
  }
};

export { handler };