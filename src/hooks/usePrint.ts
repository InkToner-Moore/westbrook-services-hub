import { useCallback, useEffect, useState } from 'react';

export interface PrintOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'letter' | 'a4' | 'receipt';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  hideElements?: string[]; // CSS selectors of elements to hide
  showElements?: string[]; // CSS selectors of elements to show only when printing
  watermark?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

export interface UsePrintReturn {
  print: (elementId?: string, options?: PrintOptions) => Promise<void>;
  isPrinting: boolean;
  printPreview: (elementId?: string, options?: PrintOptions) => void;
  generatePrintableContent: (elementId?: string, options?: PrintOptions) => string;
}

export function usePrint(): UsePrintReturn {
  const [isPrinting, setIsPrinting] = useState(false);

  // Listen for print events
  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const generatePrintableContent = useCallback((elementId?: string, options?: PrintOptions): string => {
    const element = elementId ? document.getElementById(elementId) : document.body;
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Apply print-specific modifications
    if (options?.hideElements) {
      options.hideElements.forEach(selector => {
        const elementsToHide = clonedElement.querySelectorAll(selector);
        elementsToHide.forEach(el => {
          (el as HTMLElement).classList.add('no-print');
        });
      });
    }

    if (options?.showElements) {
      options.showElements.forEach(selector => {
        const elementsToShow = clonedElement.querySelectorAll(selector);
        elementsToShow.forEach(el => {
          (el as HTMLElement).classList.add('print-only');
        });
      });
    }

    // Generate page styles
    let pageStyles = '';
    if (options?.orientation || options?.paperSize || options?.margins) {
      pageStyles = `
        @page {
          ${options.orientation ? `size: ${options.paperSize || 'letter'} ${options.orientation};` : ''}
          ${options.margins ? `
            margin-top: ${options.margins.top || '0.75in'};
            margin-right: ${options.margins.right || '0.75in'};
            margin-bottom: ${options.margins.bottom || '0.75in'};
            margin-left: ${options.margins.left || '0.75in'};
          ` : ''}
        }
      `;
    }

    // Add watermark if specified
    let watermarkHtml = '';
    if (options?.watermark) {
      watermarkHtml = `<div class="watermark">${options.watermark}</div>`;
    }

    // Create the complete HTML document
    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${options?.title || document.title}</title>
          <meta charset="utf-8">
          <style>
            ${pageStyles}
            /* Include print styles */
            @import url('/src/styles/print.css');
            
            /* Additional print-specific styles */
            body { 
              font-family: 'Times New Roman', serif !important;
              color: #000 !important;
              background: white !important;
            }
          </style>
        </head>
        <body>
          ${watermarkHtml}
          ${clonedElement.outerHTML}
          
          <!-- Print footer -->
          <div class="print-footer">
            <p>Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Ink, Toner, & Moore - Professional Printing Services</p>
          </div>
        </body>
      </html>
    `;

    return printDocument;
  }, []);

  const print = useCallback(async (elementId?: string, options?: PrintOptions): Promise<void> => {
    try {
      setIsPrinting(true);
      options?.onBeforePrint?.();

      // For receipt printing (small format)
      if (options?.paperSize === 'receipt') {
        const element = elementId ? document.getElementById(elementId) : document.body;
        if (!element) {
          throw new Error(`Element with id "${elementId}" not found`);
        }

        // Create a new window for receipt printing
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
          throw new Error('Could not open print window');
        }

        const printContent = generatePrintableContent(elementId, {
          ...options,
          margins: { top: '0.25in', right: '0.25in', bottom: '0.25in', left: '0.25in' }
        });

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      } else {
        // Regular printing
        const originalTitle = document.title;
        if (options?.title) {
          document.title = options.title;
        }

        // Apply temporary styles for printing
        const tempStyleSheet = document.createElement('style');
        tempStyleSheet.textContent = `
          @media print {
            ${options?.hideElements?.map(selector => `${selector} { display: none !important; }`).join(' ') || ''}
            ${options?.showElements?.map(selector => `${selector} { display: block !important; }`).join(' ') || ''}
          }
        `;
        document.head.appendChild(tempStyleSheet);

        // If printing specific element, temporarily hide others
        let hiddenElements: HTMLElement[] = [];
        if (elementId) {
          const targetElement = document.getElementById(elementId);
          if (targetElement) {
            // Hide all body children except the target
            Array.from(document.body.children).forEach(child => {
              if (child !== targetElement && !child.contains(targetElement)) {
                (child as HTMLElement).style.display = 'none';
                hiddenElements.push(child as HTMLElement);
              }
            });
          }
        }

        // Trigger browser print
        window.print();

        // Cleanup
        document.head.removeChild(tempStyleSheet);
        document.title = originalTitle;
        hiddenElements.forEach(element => {
          element.style.display = '';
        });
      }

      options?.onAfterPrint?.();
    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, [generatePrintableContent]);

  const printPreview = useCallback((elementId?: string, options?: PrintOptions) => {
    try {
      const printContent = generatePrintableContent(elementId, options);
      
      // Open preview in new window
      const previewWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
      if (!previewWindow) {
        throw new Error('Could not open preview window');
      }

      previewWindow.document.write(printContent);
      previewWindow.document.close();
    } catch (error) {
      console.error('Print preview failed:', error);
      throw error;
    }
  }, [generatePrintableContent]);

  return {
    print,
    isPrinting,
    printPreview,
    generatePrintableContent,
  };
}

// Utility function to create printable receipt content
export function createReceiptContent(data: {
  receiptNumber: string;
  date: string;
  customer: { name: string; phone: string };
  items: Array<{ description: string; quantity?: number; price?: number; total?: number }>;
  subtotal?: number;
  taxes?: Array<{ name: string; amount: number }>;
  total: number;
  notes?: string;
  trackingNumber?: string;
}): string {
  const businessInfo = `
    <div class="business-info">
      <h1>Ink, Toner, & Moore</h1>
      <p>Professional Printing Services</p>
      <p>Westbrook Mall, Calgary, AB</p>
      <p>Phone: (403) 686-2835</p>
    </div>
  `;

  const receiptHeader = `
    <div class="receipt-header">
      ${businessInfo}
      <div class="receipt-number">Receipt #${data.receiptNumber}</div>
      <p>Date: ${new Date(data.date).toLocaleDateString()}</p>
    </div>
  `;

  const customerInfo = `
    <div class="customer-info">
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${data.customer.name}</p>
      <p><strong>Phone:</strong> ${data.customer.phone}</p>
    </div>
  `;

  const itemsList = `
    <div class="line-items">
      <h3>Items/Services</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            ${data.items.some(item => item.quantity) ? '<th>Qty</th>' : ''}
            ${data.items.some(item => item.price) ? '<th>Price</th>' : ''}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.description}</td>
              ${data.items.some(i => i.quantity) ? `<td>${item.quantity || '-'}</td>` : ''}
              ${data.items.some(i => i.price) ? `<td>$${item.price?.toFixed(2) || '-'}</td>` : ''}
              <td>$${item.total?.toFixed(2) || '0.00'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  const totalsSection = `
    <div class="receipt-total">
      ${data.subtotal ? `<p>Subtotal: $${data.subtotal.toFixed(2)}</p>` : ''}
      ${data.taxes ? data.taxes.map(tax => `<p>${tax.name}: $${tax.amount.toFixed(2)}</p>`).join('') : ''}
      <p class="print-font-large print-font-bold">Total: $${data.total.toFixed(2)}</p>
    </div>
  `;

  const additionalInfo = `
    ${data.trackingNumber ? `
      <div class="tracking-info">
        <h3>Tracking Information</h3>
        <div class="tracking-number">${data.trackingNumber}</div>
      </div>
    ` : ''}
    ${data.notes ? `
      <div class="notes-section">
        <h3>Notes</h3>
        <p>${data.notes}</p>
      </div>
    ` : ''}
  `;

  return `
    <div class="receipt-container">
      ${receiptHeader}
      ${customerInfo}
      ${itemsList}
      ${totalsSection}
      ${additionalInfo}
      
      <div class="signature-section">
        <p>Customer Signature: <span class="signature-line"></span></p>
        <p class="print-font-small">Thank you for your business!</p>
      </div>
    </div>
  `;
}