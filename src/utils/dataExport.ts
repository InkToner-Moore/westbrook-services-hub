// Data Export Utilities for CSV and PDF export functionality

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
  filename: string;
}

// Export data to CSV format
export const exportToCSV = (data: ExportData): void => {
  const { headers, rows, filename } = data;
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // Escape commas and quotes in cell content
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Export data to PDF format
export const exportToPDF = (data: ExportData): void => {
  const { headers, rows, title, filename } = data;
  
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 20);
  
  // Add business info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Ink, Toner, & Moore', 20, 30);
  doc.text('1200 37 Street SW Unit 3b, Calgary, AB T3C 1S2', 20, 35);
  doc.text('(403) 686-2835', 20, 40);
  
  // Add export date
  const exportDate = new Date().toLocaleDateString();
  doc.text(`Exported: ${exportDate}`, 20, 50);
  
  // Add table
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 60,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Light gray
    },
    margin: { top: 60, left: 20, right: 20 },
    styles: {
      fontSize: 8,
      cellPadding: 4
    }
  });
  
  // Save the PDF
  doc.save(`${filename}.pdf`);
};

// Convert inventory data for export
export const prepareInventoryExport = (inventory: any[]): ExportData => {
  return {
    title: 'Inventory Report',
    filename: `inventory-export-${new Date().toISOString().split('T')[0]}`,
    headers: [
      'ID',
      'Category', 
      'Brand',
      'Model',
      'Type',
      'Stock Quantity',
      'Reorder Level',
      'Cost Price',
      'Sell Price',
      'Margin %',
      'Supplier',
      'Last Updated',
      'Notes'
    ],
    rows: inventory.map(item => [
      item.id,
      item.category,
      item.brand,
      item.model,
      item.type || '',
      item.stockQuantity,
      item.reorderLevel,
      `$${item.costPrice.toFixed(2)}`,
      `$${item.sellPrice.toFixed(2)}`,
      `${(((item.sellPrice - item.costPrice) / item.sellPrice) * 100).toFixed(1)}%`,
      item.supplier,
      item.lastUpdated,
      item.notes || ''
    ])
  };
};

// Convert cartridge data for export
export const prepareCartridgeExport = (cartridges: any[]): ExportData => {
  return {
    title: 'Cartridge Refills Report',
    filename: `cartridges-export-${new Date().toISOString().split('T')[0]}`,
    headers: [
      'ID',
      'Customer Name',
      'Phone',
      'Email',
      'Cartridge Type',
      'Quantity',
      'Status',
      'Date Received',
      'Est. Completion',
      'Notes'
    ],
    rows: cartridges.map(item => [
      item.id,
      item.customerName,
      item.customerPhone,
      item.customerEmail,
      item.cartridgeType,
      item.quantity,
      item.status,
      item.dateReceived,
      item.estimatedCompletion,
      item.notes || ''
    ])
  };
};

// Convert notes data for export
export const prepareNotesExport = (notes: any[]): ExportData => {
  return {
    title: 'Staff Notes Report',
    filename: `notes-export-${new Date().toISOString().split('T')[0]}`,
    headers: [
      'ID',
      'Title',
      'Category',
      'Content',
      'Author',
      'Created At',
      'Updated At'
    ],
    rows: notes.map(item => [
      item.id,
      item.title,
      item.category,
      item.content,
      item.author,
      new Date(item.createdAt).toLocaleDateString(),
      new Date(item.updatedAt).toLocaleDateString()
    ])
  };
};

// Convert blog posts data for export
export const prepareBlogExport = (posts: any[]): ExportData => {
  return {
    title: 'Blog Posts Report',
    filename: `blog-posts-export-${new Date().toISOString().split('T')[0]}`,
    headers: [
      'ID',
      'Title',
      'Status',
      'Publish Date',
      'Author',
      'Tags',
      'Excerpt'
    ],
    rows: posts.map(item => [
      item.id,
      item.title,
      item.status,
      item.publishDate,
      item.author,
      Array.isArray(item.tags) ? item.tags.join(', ') : '',
      item.excerpt
    ])
  };
};

// Export all data (comprehensive backup)
export const exportAllData = async (googleSheetsService: any): Promise<void> => {
  try {
    const [inventory, cartridges, notes, receipts, blogPosts] = await Promise.all([
      googleSheetsService.getData('inventory'),
      googleSheetsService.getData('cartridges'),
      googleSheetsService.getData('notes'),
      googleSheetsService.getData('receipts'),
      googleSheetsService.getData('blogPosts')
    ]);

    const allData = {
      inventory,
      cartridges,
      notes,
      receipts,
      blogPosts,
      exportDate: new Date().toISOString(),
      businessInfo: {
        name: 'Ink, Toner, & Moore',
        phone: '(403) 686-2835',
        address: '1200 37 Street SW Unit 3b, Calgary, AB T3C 1S2'
      }
    };

    const jsonData = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `ink-toner-moore-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting all data:', error);
    throw error;
  }
};