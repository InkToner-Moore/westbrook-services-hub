// Google Sheets API Service with Development Mock Data
// In production, this will connect to real Google Sheets API

interface SheetData {
  [key: string]: any;
}

interface GoogleSheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  range: string;
}

// Mock data for development
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
    {
      id: "INV-002",
      category: "cartridge",
      brand: "Canon",
      model: "Canon PG-245",
      type: "Black",
      stockQuantity: 3,
      reorderLevel: 5,
      costPrice: 22.50,
      sellPrice: 39.99,
      supplier: "InkJet Supplies",
      lastUpdated: "2024-01-16",
      notes: "Low stock - reorder soon"
    },
    {
      id: "INV-003",
      category: "key",
      brand: "Kwikset",
      model: "House Key",
      stockQuantity: 50,
      reorderLevel: 10,
      costPrice: 1.25,
      sellPrice: 4.99,
      supplier: "Key Supply Co",
      lastUpdated: "2024-01-17"
    }
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
    {
      id: "CART-002",
      customerName: "Jane Doe",
      customerPhone: "403-555-0456",
      customerEmail: "jane.doe@email.com",
      cartridgeType: "Canon PG-245 Color",
      quantity: 1,
      status: "in_progress",
      dateReceived: "2024-01-17",
      estimatedCompletion: "2024-01-19",
      notes: "Standard refill service"
    }
  ],
  receipts: [
    {
      id: "REC-001",
      type: "shipping",
      customerName: "John Smith",
      date: "2024-01-18",
      items: [
        { description: "UPS Standard Shipping", price: 15.99 }
      ],
      subtotal: 15.99,
      tax: 2.40,
      total: 18.39
    }
  ],
  notes: [
    {
      id: "NOTE-001",
      title: "Customer Follow-up: John Smith",
      content: "Called about HP 564XL cartridge refill. Need to contact when ready. Phone: 403-555-0123",
      category: "customer",
      createdAt: "2024-01-18T10:30:00Z",
      updatedAt: "2024-01-18T10:30:00Z",
      author: "dev@inktonermoore.com"
    }
  ],
  stickyNotes: [
    {
      id: "STICKY-001",
      content: "Remember to call supplier about bulk discount!",
      color: "yellow",
      position: { x: 50, y: 50 },
      createdAt: "2024-01-18T12:00:00Z"
    }
  ],
  blogPosts: [
    {
      id: "BLOG-001",
      title: "Welcome to Our New Website!",
      content: "We're excited to announce our new online presence...",
      excerpt: "Check out our new website with enhanced features",
      status: "published",
      publishDate: "2024-01-15",
      author: "Staff",
      tags: ["announcement", "website"]
    }
  ]
};

class GoogleSheetsService {
  private isDevelopment: boolean;
  private config: GoogleSheetsConfig;

  constructor(config?: GoogleSheetsConfig) {
    this.isDevelopment = import.meta.env.VITE_NODE_ENV === 'development' || 
                        import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    
    this.config = config || {
      spreadsheetId: import.meta.env.VITE_GOOGLE_SHEETS_ID || 'mock-sheet-id',
      apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || 'mock-api-key',
      range: 'Sheet1!A1:Z1000'
    };
  }

  // Simulate API delay for realistic development experience
  private async simulateDelay(ms: number = 500): Promise<void> {
    if (this.isDevelopment) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Get data from a specific sheet/table
  async getData(tableName: keyof typeof mockData): Promise<SheetData[]> {
    if (this.isDevelopment) {
      await this.simulateDelay();
      return JSON.parse(JSON.stringify(mockData[tableName] || []));
    }

    // Production implementation would go here
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${tableName}!A1:Z1000?key=${this.config.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.convertSheetsDataToObjects(data.values);
    } catch (error) {
      console.error('Google Sheets API error:', error);
      // Fallback to mock data if API fails
      return JSON.parse(JSON.stringify(mockData[tableName] || []));
    }
  }

  // Add new record
  async addData(tableName: keyof typeof mockData, data: SheetData): Promise<SheetData> {
    if (this.isDevelopment) {
      await this.simulateDelay();
      const newRecord = {
        ...data,
        id: data.id || `${tableName.toUpperCase()}-${Date.now()}`,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to mock data (in real app, this would persist)
      if (!mockData[tableName]) {
        mockData[tableName] = [];
      }
      (mockData[tableName] as any[]).push(newRecord);
      
      return newRecord;
    }

    // Production implementation would append to Google Sheets
    // Using Google Sheets API append endpoint
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${tableName}!A1:append?valueInputOption=RAW&key=${this.config.apiKey}`,
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
  }

  // Update existing record
  async updateData(tableName: keyof typeof mockData, id: string, data: SheetData): Promise<SheetData> {
    if (this.isDevelopment) {
      await this.simulateDelay();
      const tableData = mockData[tableName] as any[];
      const index = tableData.findIndex(item => item.id === id);
      
      if (index !== -1) {
        const updatedRecord = {
          ...tableData[index],
          ...data,
          updatedAt: new Date().toISOString()
        };
        tableData[index] = updatedRecord;
        return updatedRecord;
      }
      
      throw new Error(`Record with id ${id} not found`);
    }

    // Production implementation would update specific row in Google Sheets
    try {
      // This would require finding the row number first, then updating
      // Implementation depends on your Google Sheets structure
      console.log('Updating Google Sheets record:', { tableName, id, data });
      return { ...data, id, updatedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Failed to update data in Google Sheets:', error);
      throw error;
    }
  }

  // Delete record
  async deleteData(tableName: keyof typeof mockData, id: string): Promise<boolean> {
    if (this.isDevelopment) {
      await this.simulateDelay();
      const tableData = mockData[tableName] as any[];
      const index = tableData.findIndex(item => item.id === id);
      
      if (index !== -1) {
        tableData.splice(index, 1);
        return true;
      }
      
      return false;
    }

    // Production implementation would delete row from Google Sheets
    try {
      // This would require finding the row number first, then deleting
      console.log('Deleting from Google Sheets:', { tableName, id });
      return true;
    } catch (error) {
      console.error('Failed to delete from Google Sheets:', error);
      return false;
    }
  }

  // Convert Google Sheets array format to objects
  private convertSheetsDataToObjects(values: string[][]): SheetData[] {
    if (!values || values.length === 0) return [];
    
    const [headers, ...rows] = values;
    return rows.map(row => {
      const obj: SheetData = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  // Check if we're in development mode
  isDevMode(): boolean {
    return this.isDevelopment;
  }

  // Get mock data for development
  getMockData(): typeof mockData {
    return mockData;
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
export default GoogleSheetsService;