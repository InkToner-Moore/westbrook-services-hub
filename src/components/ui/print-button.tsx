import React from 'react';
import { Button } from './button';
import { Printer, Eye } from 'lucide-react';
import { usePrint, PrintOptions } from '@/hooks/usePrint';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface PrintButtonProps {
  elementId?: string;
  printOptions?: PrintOptions;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showPreview?: boolean;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  label?: string;
  previewLabel?: string;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  elementId,
  printOptions,
  variant = 'default',
  size = 'default',
  showPreview = true,
  className,
  children,
  disabled = false,
  label = 'Print',
  previewLabel = 'Preview'
}) => {
  const { print, printPreview, isPrinting } = usePrint();
  const { themeClasses } = useTheme();

  const handlePrint = async () => {
    try {
      await print(elementId, printOptions);
      toast({
        title: 'Print Successful',
        description: 'Document sent to printer',
      });
    } catch (error) {
      console.error('Print failed:', error);
      toast({
        title: 'Print Failed',
        description: 'Could not print document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = () => {
    try {
      printPreview(elementId, printOptions);
    } catch (error) {
      console.error('Print preview failed:', error);
      toast({
        title: 'Preview Failed',
        description: 'Could not open print preview. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (children) {
    return (
      <div className={cn('flex gap-2', className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {showPreview && (
        <Button
          variant="outline"
          size={size}
          onClick={handlePreview}
          disabled={disabled || isPrinting}
          className={cn(
            'transition-all duration-200',
            themeClasses.button.secondary,
            themeClasses.interactive.focus
          )}
        >
          <Eye className="h-4 w-4 mr-2" />
          {previewLabel}
        </Button>
      )}
      
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={disabled || isPrinting}
        className={cn(
          'transition-all duration-200',
          variant === 'default' && themeClasses.button.primary,
          themeClasses.interactive.focus,
          isPrinting && 'opacity-75 cursor-not-allowed'
        )}
      >
        <Printer className={cn(
          'h-4 w-4 mr-2',
          isPrinting && 'animate-pulse'
        )} />
        {isPrinting ? 'Printing...' : label}
      </Button>
    </div>
  );
};

// Specialized receipt print button
export interface ReceiptPrintButtonProps {
  receiptData: {
    receiptNumber: string;
    date: string;
    customer: { name: string; phone: string };
    items: Array<{ description: string; quantity?: number; price?: number; total?: number }>;
    subtotal?: number;
    taxes?: Array<{ name: string; amount: number }>;
    total: number;
    notes?: string;
    trackingNumber?: string;
  };
  className?: string;
  disabled?: boolean;
}

export const ReceiptPrintButton: React.FC<ReceiptPrintButtonProps> = ({
  receiptData,
  className,
  disabled = false
}) => {
  const { print, printPreview, isPrinting } = usePrint();

  const printOptions: PrintOptions = {
    title: `Receipt ${receiptData.receiptNumber}`,
    paperSize: 'receipt',
    margins: { top: '0.25in', right: '0.25in', bottom: '0.25in', left: '0.25in' },
    hideElements: ['.no-print', 'nav', 'header', '.sidebar', 'button:not(.print-button)'],
    onBeforePrint: () => {
      console.log('Printing receipt:', receiptData.receiptNumber);
    }
  };

  const handlePrintReceipt = async () => {
    try {
      // Create a temporary div with receipt content
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-receipt';
      tempDiv.innerHTML = `
        <div class="receipt-container">
          <div class="receipt-header">
            <div class="business-info">
              <h1>Ink, Toner, & Moore</h1>
              <p>Professional Printing Services</p>
              <p>Westbrook Mall, Calgary, AB</p>
              <p>Phone: (403) 686-2835</p>
            </div>
            <div class="receipt-number">Receipt #${receiptData.receiptNumber}</div>
            <p>Date: ${new Date(receiptData.date).toLocaleDateString()}</p>
          </div>
          
          <div class="customer-info">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${receiptData.customer.name}</p>
            <p><strong>Phone:</strong> ${receiptData.customer.phone}</p>
          </div>
          
          <div class="line-items">
            <h3>Items/Services</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  ${receiptData.items.some(item => item.quantity) ? '<th>Qty</th>' : ''}
                  ${receiptData.items.some(item => item.price) ? '<th>Price</th>' : ''}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${receiptData.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    ${receiptData.items.some(i => i.quantity) ? `<td>${item.quantity || '-'}</td>` : ''}
                    ${receiptData.items.some(i => i.price) ? `<td>$${item.price?.toFixed(2) || '-'}</td>` : ''}
                    <td>$${item.total?.toFixed(2) || '0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="receipt-total">
            ${receiptData.subtotal ? `<p>Subtotal: $${receiptData.subtotal.toFixed(2)}</p>` : ''}
            ${receiptData.taxes ? receiptData.taxes.map(tax => `<p>${tax.name}: $${tax.amount.toFixed(2)}</p>`).join('') : ''}
            <p class="print-font-large print-font-bold">Total: $${receiptData.total.toFixed(2)}</p>
          </div>
          
          ${receiptData.trackingNumber ? `
            <div class="tracking-info">
              <h3>Tracking Information</h3>
              <div class="tracking-number">${receiptData.trackingNumber}</div>
            </div>
          ` : ''}
          
          ${receiptData.notes ? `
            <div class="notes-section">
              <h3>Notes</h3>
              <p>${receiptData.notes}</p>
            </div>
          ` : ''}
          
          <div class="signature-section">
            <p>Customer Signature: <span class="signature-line"></span></p>
            <p class="print-font-small">Thank you for your business!</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      await print('temp-receipt', printOptions);
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      toast({
        title: 'Receipt Printed',
        description: `Receipt ${receiptData.receiptNumber} sent to printer`,
      });
    } catch (error) {
      console.error('Receipt print failed:', error);
      toast({
        title: 'Print Failed',
        description: 'Could not print receipt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePreviewReceipt = () => {
    try {
      // Create preview content
      const previewWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
      if (!previewWindow) {
        throw new Error('Could not open preview window');
      }

      const previewContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt ${receiptData.receiptNumber} - Preview</title>
            <style>
              body { font-family: 'Courier New', monospace; max-width: 3in; margin: 0 auto; padding: 0.5in; }
              .receipt-header { text-align: center; margin-bottom: 1em; border-bottom: 1px solid #000; padding-bottom: 0.5em; }
              .business-info h1 { margin: 0; font-size: 16pt; }
              .business-info p { margin: 0.2em 0; font-size: 10pt; }
              .receipt-number { font-weight: bold; margin: 0.5em 0; }
              .customer-info { margin: 1em 0; padding: 0.5em; border: 1px solid #000; }
              .line-items table { width: 100%; border-collapse: collapse; }
              .line-items th, .line-items td { border: 1px solid #000; padding: 0.2em; text-align: left; }
              .receipt-total { border-top: 1px solid #000; margin-top: 1em; padding-top: 0.5em; font-weight: bold; }
              .tracking-number { text-align: center; font-weight: bold; border: 1px solid #000; padding: 0.5em; margin: 1em 0; }
              .signature-line { border-bottom: 1px solid #000; width: 2in; display: inline-block; margin-left: 0.5em; }
            </style>
          </head>
          <body>
            ${receiptData ? `
              <div class="receipt-header">
                <div class="business-info">
                  <h1>Ink, Toner, & Moore</h1>
                  <p>Professional Printing Services</p>
                  <p>Westbrook Mall, Calgary, AB</p>
                  <p>Phone: (403) 686-2835</p>
                </div>
                <div class="receipt-number">Receipt #${receiptData.receiptNumber}</div>
                <p>Date: ${new Date(receiptData.date).toLocaleDateString()}</p>
              </div>
              
              <div class="customer-info">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> ${receiptData.customer.name}</p>
                <p><strong>Phone:</strong> ${receiptData.customer.phone}</p>
              </div>
              
              <div class="line-items">
                <h3>Items/Services</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${receiptData.items.map(item => `
                      <tr>
                        <td>${item.description}</td>
                        <td>$${item.total?.toFixed(2) || '0.00'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <div class="receipt-total">
                <p><strong>Total: $${receiptData.total.toFixed(2)}</strong></p>
              </div>
              
              ${receiptData.trackingNumber ? `
                <div class="tracking-number">${receiptData.trackingNumber}</div>
              ` : ''}
              
              <div style="margin: 2em 0;">
                <p>Customer Signature: <span class="signature-line"></span></p>
                <p style="font-size: 10pt; text-align: center;">Thank you for your business!</p>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      previewWindow.document.write(previewContent);
      previewWindow.document.close();
    } catch (error) {
      console.error('Receipt preview failed:', error);
      toast({
        title: 'Preview Failed',
        description: 'Could not open receipt preview.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PrintButton
      variant="default"
      size="default"
      showPreview={true}
      className={className}
      disabled={disabled}
      label="Print Receipt"
      previewLabel="Preview Receipt"
    >
      <Button
        variant="outline"
        onClick={handlePreviewReceipt}
        disabled={disabled || isPrinting}
      >
        <Eye className="h-4 w-4 mr-2" />
        Preview Receipt
      </Button>
      
      <Button
        variant="default"
        onClick={handlePrintReceipt}
        disabled={disabled || isPrinting}
      >
        <Printer className={cn(
          'h-4 w-4 mr-2',
          isPrinting && 'animate-pulse'
        )} />
        {isPrinting ? 'Printing...' : 'Print Receipt'}
      </Button>
    </PrintButton>
  );
};

export default PrintButton;