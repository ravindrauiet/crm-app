import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

// Helper to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  
  if (date.toDate && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString();
  }
  
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString();
  }
  
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  
  return 'N/A';
};

// Helper to format currency
const formatCurrency = (amount) => {
  if (!amount) return '$0.00';
  return '$' + parseFloat(amount).toFixed(2);
};

/**
 * Generate HTML content for repair invoice
 */
const generateInvoiceHTML = (repair, shopDetails) => {
  console.log('Generating invoice for repair: ', repair.id);
  
  // Calculate total cost
  const partsCost = repair.parts?.reduce((sum, part) => sum + (parseFloat(part.price) || 0), 0) || 0;
  const laborCost = parseFloat(repair.laborCost) || 0;
  const totalCost = partsCost + laborCost;
  
  // Format warranty date if available
  const hasWarranty = repair.warrantyDays && parseInt(repair.warrantyDays) > 0;
  const warrantyDays = hasWarranty ? parseInt(repair.warrantyDays) : 0;
  const warrantyUntil = hasWarranty
    ? new Date(new Date(repair.completedAt || new Date()).setDate(new Date(repair.completedAt || new Date()).getDate() + warrantyDays))
    : null;
  
  // Calculate taxes if available
  const taxRate = repair.taxRate || shopDetails?.defaultTaxRate || 0;
  const taxAmount = (taxRate / 100) * totalCost;
  const grandTotal = totalCost + taxAmount;
  
  const paymentStatus = repair.isPaid ? 'PAID' : 'PENDING';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>Repair Invoice</title>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            padding: 20px;
            color: #333;
            background-color: #f9f9f9;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            padding: 30px;
            border: 1px solid #ddd;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            background-color: white;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 15px;
          }
          .shop-info h1 {
            color: #2196F3;
            margin: 0 0 10px 0;
          }
          .shop-info p {
            margin: 0 0 5px 0;
            color: #555;
          }
          .invoice-title {
            text-align: right;
          }
          .invoice-title h2 {
            color: #2196F3;
            margin: 0 0 5px 0;
          }
          .payment-status {
            display: inline-block;
            padding: 5px 10px;
            margin-top: 10px;
            font-weight: bold;
            border-radius: 4px;
            color: white;
            background-color: ${repair.isPaid ? '#4CAF50' : '#FF9800'};
          }
          .section-title {
            color: #2196F3;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
            margin-top: 25px;
            font-size: 18px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .details-table th {
            text-align: left;
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
          }
          .details-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .warranty-box {
            margin-top: 20px;
            padding: 15px;
            border: 2px solid #4CAF50;
            background-color: #E8F5E9;
            border-radius: 5px;
          }
          .no-warranty-box {
            margin-top: 20px;
            padding: 15px;
            border: 2px solid #FFA726;
            background-color: #FFF3E0;
            border-radius: 5px;
          }
          .warranty-title {
            color: #4CAF50;
            margin-top: 0;
            font-size: 18px;
          }
          .no-warranty-title {
            color: #FFA726;
            margin-top: 0;
            font-size: 18px;
          }
          .total-section {
            margin-top: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .grand-total {
            font-size: 20px;
            font-weight: bold;
            color: #2196F3;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #ddd;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          .barcode {
            text-align: center;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .notes-section {
            margin-top: 25px;
            padding: 10px;
            background-color: #f9f9f9;
            border-left: 3px solid #2196F3;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="invoice-header">
            <div class="shop-info">
              <h1>${shopDetails?.shopName || 'Repair Shop'}</h1>
              <p>${shopDetails?.address || ''}</p>
              <p>Phone: ${shopDetails?.phone || 'N/A'}</p>
              <p>Email: ${shopDetails?.email || 'N/A'}</p>
              ${shopDetails?.website ? `<p>Web: ${shopDetails.website}</p>` : ''}
              ${shopDetails?.taxId ? `<p>Tax ID: ${shopDetails.taxId}</p>` : ''}
            </div>
            <div class="invoice-title">
              <h2>Repair Invoice</h2>
              <p>Invoice #: ${repair.invoiceNumber || `INV-${repair.id?.substring(0, 8)}` || 'N/A'}</p>
              <p>Date: ${formatDate(repair.completedAt || repair.updatedAt || repair.createdAt)}</p>
              <div class="payment-status">${paymentStatus}</div>
            </div>
          </div>
          
          <div class="section-title">Customer Information</div>
          <p><strong>Name:</strong> ${repair.customerName || 'N/A'}</p>
          <p><strong>Phone:</strong> ${repair.customerPhone || 'N/A'}</p>
          <p><strong>Email:</strong> ${repair.customerEmail || 'N/A'}</p>
          ${repair.customerAddress ? `<p><strong>Address:</strong> ${repair.customerAddress}</p>` : ''}
          
          <div class="section-title">Device Information</div>
          <p><strong>Device Type:</strong> ${repair.deviceType || 'N/A'}</p>
          <p><strong>Brand:</strong> ${repair.deviceBrand || 'N/A'}</p>
          <p><strong>Model:</strong> ${repair.deviceModel || 'N/A'}</p>
          <p><strong>Serial Number:</strong> ${repair.serialNumber || 'N/A'}</p>
          <p><strong>Condition on Receipt:</strong> ${repair.deviceCondition || 'Not specified'}</p>
          
          <div class="section-title">Repair Details</div>
          <p><strong>Issues Reported:</strong> ${repair.issueDescription || 'None reported'}</p>
          <p><strong>Diagnosis:</strong> ${repair.diagnosis || 'Not specified'}</p>
          <p><strong>Services Performed:</strong> ${repair.services?.join(', ') || 'N/A'}</p>
          <p><strong>Technician:</strong> ${repair.technicianName || 'Not specified'}</p>
          
          <div class="section-title">Cost Breakdown</div>
          <table class="details-table">
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
            ${repair.parts?.map(part => `
              <tr>
                <td>${part.name || 'Part'} ${part.description ? `- ${part.description}` : ''}</td>
                <td>${part.quantity || 1}</td>
                <td>${formatCurrency(part.unitPrice || part.price)}</td>
                <td>${formatCurrency((part.price) || ((part.unitPrice || 0) * (part.quantity || 1)))}</td>
              </tr>
            `).join('') || '<tr><td colspan="4">No parts</td></tr>'}
            <tr>
              <td>Labor</td>
              <td>${repair.laborHours ? repair.laborHours : '1'}</td>
              <td>${repair.laborRate ? formatCurrency(repair.laborRate) : 'Flat rate'}</td>
              <td>${formatCurrency(laborCost)}</td>
            </tr>
            ${repair.additionalFees?.map(fee => `
              <tr>
                <td>${fee.description || 'Additional Fee'}</td>
                <td>1</td>
                <td>-</td>
                <td>${formatCurrency(fee.amount)}</td>
              </tr>
            `).join('') || ''}
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span><strong>Parts Total:</strong></span>
              <span>${formatCurrency(partsCost)}</span>
            </div>
            <div class="total-row">
              <span><strong>Labor Total:</strong></span>
              <span>${formatCurrency(laborCost)}</span>
            </div>
            ${taxRate > 0 ? `
              <div class="total-row">
                <span><strong>Subtotal:</strong></span>
                <span>${formatCurrency(totalCost)}</span>
              </div>
              <div class="total-row">
                <span><strong>Tax (${taxRate}%):</strong></span>
                <span>${formatCurrency(taxAmount)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(grandTotal)}</span>
            </div>
            ${repair.deposit > 0 ? `
              <div class="total-row">
                <span><strong>Deposit Paid:</strong></span>
                <span>${formatCurrency(repair.deposit)}</span>
              </div>
              <div class="total-row">
                <span><strong>Balance Due:</strong></span>
                <span>${formatCurrency(grandTotal - repair.deposit)}</span>
              </div>
            ` : ''}
          </div>
          
          ${hasWarranty ? `
            <div class="warranty-box">
              <h3 class="warranty-title">Warranty Information</h3>
              <p><strong>This repair is covered by a ${warrantyDays}-day warranty</strong></p>
              <p>Valid until: ${warrantyUntil ? formatDate(warrantyUntil) : 'N/A'}</p>
              <p>${repair.warrantyNotes || 'Covers defects in parts and workmanship for the specified period. Does not cover physical damage, water damage, or other accidental damage after repair.'}</p>
            </div>
          ` : `
            <div class="no-warranty-box">
              <h3 class="no-warranty-title">No Warranty Provided</h3>
              <p>This repair does not include a warranty period. All sales are final.</p>
            </div>
          `}
          
          ${repair.notes ? `
            <div class="notes-section">
              <strong>Additional Notes:</strong>
              <p>${repair.notes}</p>
            </div>
          ` : ''}
          
          <div class="barcode">
            ${repair.id || ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>${shopDetails?.shopName || 'Repair Shop'} - ${new Date().getFullYear()}</p>
            <p>Payment Terms: ${shopDetails?.paymentTerms || 'Due upon receipt'}</p>
            ${shopDetails?.returnPolicy ? `<p>${shopDetails.returnPolicy}</p>` : ''}
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate a PDF for a repair invoice
 */
export const generateRepairPDF = async (repair, shopDetails) => {
  try {
    console.log('Generating PDF for repair: ', repair.id);
    
    // Generate the HTML content
    const html = generateInvoiceHTML(repair, shopDetails);
    
    // Create a temporary PDF file
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false
    });
    
    console.log('PDF created at:', uri);
    
    // Optional: Move file to a more permanent location
    const fileName = `Repair_Invoice_${repair.id?.substring(0, 8) || 'Unknown'}_${Date.now()}.pdf`;
    const pdfDirectory = `${FileSystem.documentDirectory}invoices/`;
    
    // Create invoices directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(pdfDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(pdfDirectory, { intermediates: true });
    }
    
    const destinationUri = `${pdfDirectory}${fileName}`;
    await FileSystem.moveAsync({
      from: uri,
      to: destinationUri
    });
    
    console.log('PDF moved to:', destinationUri);
    return destinationUri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert('Error', 'Failed to generate PDF');
    throw error;
  }
};

/**
 * Share a PDF file
 */
export const shareRepairPDF = async (repair, shopDetails) => {
  try {
    console.log('Sharing PDF for repair: ', repair.id);
    
    // First generate the PDF
    const pdfUri = await generateRepairPDF(repair, shopDetails);
    
    // Check if sharing is available on the device
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on your device');
      return false;
    }
    
    // Share the PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Repair Invoice',
      UTI: 'com.adobe.pdf' // iOS only
    });
    
    console.log('PDF shared successfully');
    return true;
  } catch (error) {
    console.error('Error sharing PDF:', error);
    Alert.alert('Error', 'Failed to share PDF');
    throw error;
  }
};

/**
 * Generate HTML content for a customer receipt
 */
const generateReceiptHTML = (transaction, shopDetails) => {
  console.log('Generating receipt for transaction: ', transaction.id);
  
  // Calculate totals
  const subtotal = transaction.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
  const taxRate = transaction.taxRate || shopDetails?.defaultTaxRate || 0;
  const taxAmount = (taxRate / 100) * subtotal;
  const discountAmount = transaction.discountAmount || 0;
  const total = transaction.total || (subtotal + taxAmount - discountAmount);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>Customer Receipt</title>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            padding: 20px;
            color: #333;
            background-color: #f9f9f9;
          }
          .receipt-box {
            max-width: 500px;
            margin: auto;
            padding: 30px;
            border: 1px solid #ddd;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            background-color: white;
          }
          .shop-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 15px;
          }
          .shop-header h1 {
            color: #2196F3;
            margin: 0 0 10px 0;
          }
          .shop-header p {
            margin: 0 0 5px 0;
            color: #555;
          }
          .receipt-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 15px 0;
            color: #2196F3;
          }
          .receipt-info {
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .receipt-info p {
            margin: 5px 0;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .details-table th {
            text-align: left;
            padding: 8px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
          }
          .details-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .total-section {
            margin-top: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #ddd;
          }
          .payment-info {
            margin: 20px 0;
            padding: 10px;
            background-color: #E8F5E9;
            border-radius: 5px;
            border-left: 3px solid #4CAF50;
          }
          .barcode {
            text-align: center;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="shop-header">
            <h1>${shopDetails?.shopName || 'Repair Shop'}</h1>
            <p>${shopDetails?.address || ''}</p>
            <p>Phone: ${shopDetails?.phone || 'N/A'}</p>
            ${shopDetails?.email ? `<p>Email: ${shopDetails.email}</p>` : ''}
            ${shopDetails?.website ? `<p>Web: ${shopDetails.website}</p>` : ''}
          </div>
          
          <div class="receipt-title">CUSTOMER RECEIPT</div>
          
          <div class="receipt-info">
            <p><strong>Date:</strong> ${formatDate(transaction.date || new Date())}</p>
            <p><strong>Receipt #:</strong> ${transaction.receiptNumber || `REC-${transaction.id?.substring(0, 8)}` || 'N/A'}</p>
            <p><strong>Customer:</strong> ${transaction.customerName || 'N/A'}</p>
            ${transaction.customerPhone ? `<p><strong>Phone:</strong> ${transaction.customerPhone}</p>` : ''}
            ${transaction.customerEmail ? `<p><strong>Email:</strong> ${transaction.customerEmail}</p>` : ''}
          </div>
          
          <table class="details-table">
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
            ${transaction.items?.map(item => `
              <tr>
                <td>${item.name || 'Item'} ${item.description ? `<br><small>${item.description}</small>` : ''}</td>
                <td>${item.quantity || 1}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
              </tr>
            `).join('') || '<tr><td colspan="4">No items</td></tr>'}
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span><strong>Subtotal:</strong></span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            ${taxRate > 0 ? `
              <div class="total-row">
                <span><strong>Tax (${taxRate}%):</strong></span>
                <span>${formatCurrency(taxAmount)}</span>
              </div>
            ` : ''}
            ${discountAmount > 0 ? `
              <div class="total-row">
                <span><strong>Discount:</strong></span>
                <span>-${formatCurrency(discountAmount)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(total)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <p><strong>Payment Method:</strong> ${transaction.paymentMethod || 'N/A'}</p>
            ${transaction.paymentReference ? `<p><strong>Reference:</strong> ${transaction.paymentReference}</p>` : ''}
            <p><strong>Status:</strong> ${transaction.paymentStatus || 'Paid'}</p>
          </div>
          
          ${transaction.notes ? `
            <div style="margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #2196F3;">
              <strong>Notes:</strong>
              <p>${transaction.notes}</p>
            </div>
          ` : ''}
          
          <div class="barcode">
            ${transaction.id || ''}
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>${shopDetails?.shopName || 'Repair Shop'} - ${new Date().getFullYear()}</p>
            ${shopDetails?.returnPolicy ? `<p>${shopDetails.returnPolicy}</p>` : ''}
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate a customer receipt PDF
 */
export const generateReceiptPDF = async (transaction, shopDetails) => {
  try {
    console.log('Generating receipt PDF for transaction: ', transaction.id);
    
    // Generate the HTML content
    const html = generateReceiptHTML(transaction, shopDetails);
    
    // Create a temporary PDF file
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false
    });
    
    console.log('Receipt PDF created at:', uri);
    
    // Optional: Move file to a more permanent location
    const fileName = `Receipt_${transaction.id?.substring(0, 8) || 'Unknown'}_${Date.now()}.pdf`;
    const pdfDirectory = `${FileSystem.documentDirectory}receipts/`;
    
    // Create receipts directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(pdfDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(pdfDirectory, { intermediates: true });
    }
    
    const destinationUri = `${pdfDirectory}${fileName}`;
    await FileSystem.moveAsync({
      from: uri,
      to: destinationUri
    });
    
    console.log('Receipt PDF moved to:', destinationUri);
    return destinationUri;
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    Alert.alert('Error', 'Failed to generate receipt PDF');
    throw error;
  }
};

/**
 * Share a receipt PDF
 */
export const shareReceiptPDF = async (transaction, shopDetails) => {
  try {
    console.log('Sharing receipt PDF for transaction: ', transaction.id);
    
    // First generate the PDF
    const pdfUri = await generateReceiptPDF(transaction, shopDetails);
    
    // Check if sharing is available on the device
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on your device');
      return false;
    }
    
    // Share the PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Receipt',
      UTI: 'com.adobe.pdf' // iOS only
    });
    
    console.log('Receipt PDF shared successfully');
    return true;
  } catch (error) {
    console.error('Error sharing receipt PDF:', error);
    Alert.alert('Error', 'Failed to share receipt PDF');
    throw error;
  }
};

/**
 * Generate HTML content for inventory report
 */
const generateInventoryReportHTML = (inventoryItems, shopDetails, reportOptions = {}) => {
  console.log('Generating inventory report');
  
  const { title = 'Inventory Report', showLowStock = true, categorized = false } = reportOptions;
  
  // Categorize items if requested
  let categorizedItems = {};
  if (categorized && inventoryItems.length > 0) {
    inventoryItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categorizedItems[category]) {
        categorizedItems[category] = [];
      }
      categorizedItems[category].push(item);
    });
  }
  
  // Filter low stock items if needed
  const lowStockItems = showLowStock ? 
    inventoryItems.filter(item => (item.currentStock || 0) <= (item.lowStockThreshold || 5)) : 
    [];
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>${title}</title>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            padding: 20px;
            color: #333;
          }
          .report-box {
            max-width: 800px;
            margin: auto;
            padding: 20px;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
          }
          .report-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
          }
          .report-header h1 {
            color: #2196F3;
            margin: 0 0 10px 0;
          }
          .section-title {
            color: #2196F3;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
            margin-top: 20px;
          }
          .inventory-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .inventory-table th {
            text-align: left;
            padding: 8px;
            background-color: #f8f9fa;
          }
          .inventory-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .low-stock {
            color: #f44336;
            font-weight: bold;
          }
          .totals {
            margin-top: 20px;
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 12px;
          }
          .category-title {
            margin-top: 25px;
            color: #555;
            font-weight: bold;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="report-box">
          <div class="report-header">
            <h1>${shopDetails?.shopName || 'Repair Shop'}</h1>
            <h2>${title}</h2>
            <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          </div>
          
          ${showLowStock && lowStockItems.length > 0 ? `
            <h3 class="section-title">Low Stock Items (Attention Required)</h3>
            <table class="inventory-table">
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Unit Price</th>
              </tr>
              ${lowStockItems.map(item => `
                <tr>
                  <td>${item.name || 'N/A'}</td>
                  <td>${item.sku || 'N/A'}</td>
                  <td class="low-stock">${item.currentStock || 0}</td>
                  <td>${item.lowStockThreshold || 5}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}
          
          ${categorized ? `
            <h3 class="section-title">Inventory by Category</h3>
            ${Object.keys(categorizedItems).map(category => `
              <div class="category-title">${category}</div>
              <table class="inventory-table">
                <tr>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Unit Price</th>
                  <th>Total Value</th>
                </tr>
                ${categorizedItems[category].map(item => `
                  <tr>
                    <td>${item.name || 'N/A'}</td>
                    <td>${item.sku || 'N/A'}</td>
                    <td ${(item.currentStock || 0) <= (item.lowStockThreshold || 5) ? 'class="low-stock"' : ''}>${item.currentStock || 0}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency((item.currentStock || 0) * (item.unitPrice || 0))}</td>
                  </tr>
                `).join('')}
              </table>
            `).join('')}
          ` : `
            <h3 class="section-title">Full Inventory</h3>
            <table class="inventory-table">
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Unit Price</th>
                <th>Total Value</th>
              </tr>
              ${inventoryItems.map(item => `
                <tr>
                  <td>${item.name || 'N/A'}</td>
                  <td>${item.sku || 'N/A'}</td>
                  <td>${item.category || 'Uncategorized'}</td>
                  <td ${(item.currentStock || 0) <= (item.lowStockThreshold || 5) ? 'class="low-stock"' : ''}>${item.currentStock || 0}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency((item.currentStock || 0) * (item.unitPrice || 0))}</td>
                </tr>
              `).join('')}
            </table>
          `}
          
          <div class="totals">
            <p><strong>Total Items:</strong> ${inventoryItems.length}</p>
            <p><strong>Total Inventory Value:</strong> ${formatCurrency(
              inventoryItems.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.unitPrice || 0)), 0)
            )}</p>
          </div>
          
          <div class="footer">
            <p>${shopDetails?.shopName || 'Repair Shop'} - ${new Date().getFullYear()}</p>
            <p>This is an auto-generated report and is valid as of the date shown above.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate an inventory report PDF
 */
export const generateInventoryReportPDF = async (inventoryItems, shopDetails, reportOptions = {}) => {
  try {
    console.log('Generating inventory report PDF');
    
    // Generate the HTML content
    const html = generateInventoryReportHTML(inventoryItems, shopDetails, reportOptions);
    
    // Create a temporary PDF file
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false
    });
    
    console.log('Inventory PDF created at:', uri);
    
    // Optional: Move file to a more permanent location
    const fileName = `Inventory_Report_${Date.now()}.pdf`;
    const pdfDirectory = `${FileSystem.documentDirectory}reports/`;
    
    // Create reports directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(pdfDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(pdfDirectory, { intermediates: true });
    }
    
    const destinationUri = `${pdfDirectory}${fileName}`;
    await FileSystem.moveAsync({
      from: uri,
      to: destinationUri
    });
    
    console.log('Inventory PDF moved to:', destinationUri);
    return destinationUri;
  } catch (error) {
    console.error('Error generating inventory PDF:', error);
    Alert.alert('Error', 'Failed to generate inventory report PDF');
    throw error;
  }
};

/**
 * Share an inventory report PDF
 */
export const shareInventoryReportPDF = async (inventoryItems, shopDetails, reportOptions = {}) => {
  try {
    console.log('Sharing inventory report PDF');
    
    // First generate the PDF
    const pdfUri = await generateInventoryReportPDF(inventoryItems, shopDetails, reportOptions);
    
    // Check if sharing is available on the device
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on your device');
      return false;
    }
    
    // Share the PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Inventory Report',
      UTI: 'com.adobe.pdf' // iOS only
    });
    
    console.log('Inventory report PDF shared successfully');
    return true;
  } catch (error) {
    console.error('Error sharing inventory report PDF:', error);
    Alert.alert('Error', 'Failed to share inventory report PDF');
    throw error;
  }
};

/**
 * Generate HTML content for warranty certificate
 */
const generateWarrantyCertificateHTML = (repair, shopDetails) => {
  console.log('Generating warranty certificate for repair: ', repair.id);
  
  // Get warranty information if available
  const hasWarranty = repair.warrantyDays && parseInt(repair.warrantyDays) > 0;
  const warrantyDays = hasWarranty ? parseInt(repair.warrantyDays) : 0;
  const warrantyUntil = hasWarranty 
    ? new Date(new Date(repair.completedAt || new Date()).setDate(new Date(repair.completedAt || new Date()).getDate() + warrantyDays))
    : null;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>Warranty Certificate</title>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            padding: 20px;
            color: #333;
            background-color: #f9f9f9;
          }
          .certificate-box {
            max-width: 800px;
            margin: auto;
            padding: 30px;
            border: 1px solid #ddd;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            background-color: white;
            position: relative;
          }
          .certificate-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 15px;
          }
          .certificate-title {
            color: #2196F3;
            font-size: 28px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .certificate-subtitle {
            color: #555;
            font-size: 16px;
            margin-bottom: 5px;
          }
          .shop-info {
            margin-bottom: 25px;
          }
          .shop-info h2 {
            color: #2196F3;
            margin: 0 0 10px 0;
          }
          .section {
            margin: 20px 0;
          }
          .section-title {
            color: #2196F3;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
            margin-top: 25px;
            font-size: 18px;
          }
          .warranty-details {
            margin: 20px 0;
            padding: 15px;
            border: ${hasWarranty ? '2px solid #4CAF50' : '2px solid #FFA726'};
            background-color: ${hasWarranty ? '#E8F5E9' : '#FFF3E0'};
            border-radius: 5px;
          }
          .warranty-date {
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
            color: ${hasWarranty ? '#4CAF50' : '#FFA726'};
          }
          .stamp {
            position: absolute;
            bottom: 70px;
            right: 40px;
            width: 120px;
            height: 120px;
            border: 2px solid ${hasWarranty ? '#4CAF50' : '#FFA726'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(-15deg);
            opacity: 0.8;
          }
          .stamp-text {
            text-align: center;
            font-weight: bold;
            color: ${hasWarranty ? '#4CAF50' : '#FFA726'};
            font-size: 14px;
            text-transform: uppercase;
          }
          .signature {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          table th, table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          table th {
            background-color: #f8f9fa;
          }
        </style>
      </head>
      <body>
        <div class="certificate-box">
          <div class="certificate-header">
            <div class="certificate-title">Warranty Certificate</div>
            <div class="certificate-subtitle">Repair Service Warranty</div>
            <div class="certificate-subtitle">Certificate #: WC-${repair.id?.substring(0, 8) || 'Unknown'}</div>
          </div>
          
          <div class="shop-info">
            <h2>${shopDetails?.shopName || 'Repair Shop'}</h2>
            <p>${shopDetails?.address || ''}</p>
            <p>Phone: ${shopDetails?.phone || 'N/A'} | Email: ${shopDetails?.email || 'N/A'}</p>
          </div>
          
          <div class="section">
            <p>This certificate confirms that the following device repair has been completed by ${shopDetails?.shopName || 'our repair shop'}:</p>
          </div>
          
          <div class="section-title">Customer Information</div>
          <p><strong>Name:</strong> ${repair.customerName || 'N/A'}</p>
          <p><strong>Phone:</strong> ${repair.customerPhone || 'N/A'}</p>
          <p><strong>Email:</strong> ${repair.customerEmail || 'N/A'}</p>
          
          <div class="section-title">Device Information</div>
          <p><strong>Device Type:</strong> ${repair.deviceType || 'N/A'}</p>
          <p><strong>Model:</strong> ${repair.deviceModel || 'N/A'}</p>
          <p><strong>Serial Number:</strong> ${repair.serialNumber || 'N/A'}</p>
          
          <div class="section-title">Repair Details</div>
          <p><strong>Repair Date:</strong> ${formatDate(repair.completedAt || repair.updatedAt || repair.createdAt)}</p>
          <p><strong>Services Performed:</strong> ${repair.services?.join(', ') || 'N/A'}</p>
          
          <table>
            <tr>
              <th>Parts Replaced</th>
              <th>Description</th>
            </tr>
            ${repair.parts?.map(part => `
              <tr>
                <td>${part.name || 'Part'}</td>
                <td>${part.description || 'N/A'}</td>
              </tr>
            `).join('') || '<tr><td colspan="2">No parts replaced</td></tr>'}
          </table>
          
          <div class="warranty-details">
            <h3 style="margin-top: 0; color: ${hasWarranty ? '#4CAF50' : '#FFA726'};">
              ${hasWarranty ? 'Warranty Information' : 'Service Confirmation'}
            </h3>
            
            ${hasWarranty ? `
              <p>This repair is covered by a <strong>${warrantyDays}-day warranty</strong> from the date of service.</p>
              <div class="warranty-date">Valid until: ${formatDate(warrantyUntil)}</div>
              <p>${repair.warrantyNotes || 'This warranty covers defects in parts and workmanship for the specified period. It does not cover physical damage, water damage, or other accidental damage after repair. For warranty service, please return to our shop with this certificate.'}</p>
            ` : `
              <p>This certificate confirms that the repair service has been completed. No specific warranty period has been assigned to this repair.</p>
              <p>For any issues related to this repair, please contact our shop with the certificate number.</p>
            `}
          </div>
          
          <div class="stamp">
            <div class="stamp-text">
              ${hasWarranty ? `${warrantyDays} Days<br>Warranty` : 'Service<br>Completed'}
            </div>
          </div>
          
          <div class="signature">
            <p>Authorized Signature: _________________________</p>
            <p>Date: ${formatDate(new Date())}</p>
          </div>
          
          <div class="footer">
            <p>This certificate serves as proof of service and warranty (if applicable).</p>
            <p>Please keep this document for your records.</p>
            <p>${shopDetails?.shopName || 'Repair Shop'} - ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate a warranty certificate PDF
 */
export const generateWarrantyCertificatePDF = async (repair, shopDetails) => {
  try {
    console.log('Generating warranty certificate PDF for repair: ', repair.id);
    
    // Generate the HTML content
    const html = generateWarrantyCertificateHTML(repair, shopDetails);
    
    // Create a temporary PDF file
    const { uri } = await Print.printToFileAsync({ 
      html,
      base64: false
    });
    
    console.log('Warranty certificate PDF created at:', uri);
    
    // Move file to a more permanent location
    const fileName = `Warranty_Certificate_${repair.id?.substring(0, 8) || 'Unknown'}_${Date.now()}.pdf`;
    const pdfDirectory = `${FileSystem.documentDirectory}warranty/`;
    
    // Create warranty directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(pdfDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(pdfDirectory, { intermediates: true });
    }
    
    const destinationUri = `${pdfDirectory}${fileName}`;
    await FileSystem.moveAsync({
      from: uri,
      to: destinationUri
    });
    
    console.log('Warranty certificate PDF moved to:', destinationUri);
    return destinationUri;
  } catch (error) {
    console.error('Error generating warranty certificate PDF:', error);
    Alert.alert('Error', 'Failed to generate warranty certificate');
    throw error;
  }
};

/**
 * Share a warranty certificate PDF
 */
export const shareWarrantyCertificatePDF = async (repair, shopDetails) => {
  try {
    console.log('Sharing warranty certificate PDF for repair: ', repair.id);
    
    // First generate the PDF
    const pdfUri = await generateWarrantyCertificatePDF(repair, shopDetails);
    
    // Check if sharing is available on the device
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on your device');
      return false;
    }
    
    // Share the PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Warranty Certificate',
      UTI: 'com.adobe.pdf' // iOS only
    });
    
    console.log('Warranty certificate PDF shared successfully');
    return true;
  } catch (error) {
    console.error('Error sharing warranty certificate PDF:', error);
    Alert.alert('Error', 'Failed to share warranty certificate');
    throw error;
  }
};

/**
 * Simple test function for PDF generation
 */
export const testPdfGeneration = async () => {
  try {
    console.log('Running PDF test');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <title>Test PDF</title>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
            h1 { color: #2196F3; }
          </style>
        </head>
        <body>
          <h1>Test PDF</h1>
          <p>This is a test PDF generated with expo-print.</p>
          <p>Generated at: ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `;
    
    const { uri } = await Print.printToFileAsync({ html });
    
    console.log('Test PDF created at:', uri);
    
    // Share the test PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Test PDF'
      });
      console.log('Test PDF shared successfully');
    }
    
    return uri;
  } catch (error) {
    console.error('Error in test PDF generation:', error);
    Alert.alert('Test Failed', error.message || 'Unknown error');
    throw error;
  }
}; 