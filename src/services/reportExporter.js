const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Ensure exports directory exists
const EXPORTS_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Helper function to add Arabic text support
const addArabicText = (doc, text, x, y, options = {}) => {
  doc.text(text, x, y, {
    align: options.align || 'right',
    width: options.width || 200,
    ...options
  });
};

// Helper function to create table headers
const createTableHeader = (doc, headers, startY, colWidths) => {
  let currentX = 50;
  
  // Header background
  doc.rect(50, startY, colWidths.reduce((sum, width) => sum + width, 0), 25)
     .fillAndStroke('#28a745', '#28a745');
  
  // Header text
  doc.fillColor('white')
     .fontSize(10);
  
  headers.forEach((header, index) => {
    doc.text(header, currentX + 5, startY + 8, {
      width: colWidths[index] - 10,
      align: 'center'
    });
    currentX += colWidths[index];
  });
  
  doc.fillColor('black');
  return startY + 25;
};

// Helper function to create table rows
const createTableRow = (doc, row, startY, colWidths, isEven = false) => {
  let currentX = 50;
  
  // Row background for alternating colors
  if (isEven) {
    doc.rect(50, startY, colWidths.reduce((sum, width) => sum + width, 0), 20)
       .fillAndStroke('#f8f9fa', '#f8f9fa');
  }
  
  doc.fillColor('black')
     .fontSize(9);
  
  row.forEach((cell, index) => {
    doc.text(cell.toString(), currentX + 5, startY + 6, {
      width: colWidths[index] - 10,
      align: 'center'
    });
    currentX += colWidths[index];
  });
  
  return startY + 20;
};

/**
 * Export profit distribution report to PDF
 */
const exportProfitDistributionToPDF = async (financialYear, distributions) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `profit-distribution-${financialYear.year}-${Date.now()}.pdf`;
      const filePath = path.join(EXPORTS_DIR, fileName);
      
      // Create write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Title
      doc.fontSize(18)
         .text(`تقرير توزيع الأرباح - السنة المالية ${financialYear.year}`, 50, 50, {
           align: 'center',
           width: 500
         });
      
      // Financial year info
      let currentY = 100;
      doc.fontSize(12);
      
      addArabicText(doc, `السنة المالية: ${financialYear.year}`, 50, currentY);
      currentY += 20;
      addArabicText(doc, `تاريخ البداية: ${new Date(financialYear.startDate).toLocaleDateString('ar-SA')}`, 50, currentY);
      currentY += 20;
      addArabicText(doc, `تاريخ النهاية: ${new Date(financialYear.endDate).toLocaleDateString('ar-SA')}`, 50, currentY);
      currentY += 20;
      addArabicText(doc, `إجمالي الربح: ${financialYear.totalProfit.toLocaleString()} ${financialYear.currency}`, 50, currentY);
      currentY += 20;
      addArabicText(doc, `معدل الربح اليومي: ${financialYear.dailyProfitRate?.toFixed(6)}`, 50, currentY);
      currentY += 40;
      
      // Table
      const headers = ['المساهم', 'الرقم الوطني', 'مبلغ الاستثمار', 'عدد الأيام', 'الربح المحسوب', 'الحالة'];
      const colWidths = [100, 80, 90, 60, 90, 80];
      
      currentY = createTableHeader(doc, headers, currentY, colWidths);
      
      distributions.forEach((dist, index) => {
        const row = [
          dist.investorId.fullName,
          dist.investorId.nationalId,
          `${dist.calculation.investmentAmount.toLocaleString()} ${dist.currency}`,
          dist.calculation.totalDays.toString(),
          `${dist.calculation.calculatedProfit.toLocaleString()} ${dist.currency}`,
          dist.status === 'calculated' ? 'محسوب' : 
          dist.status === 'approved' ? 'موافق عليه' : 
          dist.status === 'distributed' ? 'موزع' : dist.status
        ];
        
        currentY = createTableRow(doc, row, currentY, colWidths, index % 2 === 0);
        
        // Add new page if needed
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
          currentY = createTableHeader(doc, headers, currentY, colWidths);
        }
      });
      
      // Footer
      doc.fontSize(10)
         .text(`تم إنشاء التقرير في: ${new Date().toLocaleString('ar-SA')}`, 50, doc.page.height - 50, {
           align: 'center',
           width: 500
         });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ fileName, filePath });
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Export profit distribution report to Excel
 */
const exportProfitDistributionToExcel = async (financialYear, distributions) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`السنة المالية ${financialYear.year}`);
    
    // Title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `تقرير توزيع الأرباح - السنة المالية ${financialYear.year}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Financial year info
    worksheet.getCell('A3').value = 'معلومات السنة المالية:';
    worksheet.getCell('A3').font = { bold: true };
    
    worksheet.getCell('A4').value = `السنة المالية: ${financialYear.year}`;
    worksheet.getCell('A5').value = `تاريخ البداية: ${new Date(financialYear.startDate).toLocaleDateString('ar-SA')}`;
    worksheet.getCell('A6').value = `تاريخ النهاية: ${new Date(financialYear.endDate).toLocaleDateString('ar-SA')}`;
    worksheet.getCell('A7').value = `إجمالي الربح: ${financialYear.totalProfit.toLocaleString()} ${financialYear.currency}`;
    worksheet.getCell('A8').value = `معدل الربح اليومي: ${financialYear.dailyProfitRate?.toFixed(6)}`;
    
    // Table headers
    const headerRow = worksheet.getRow(10);
    headerRow.values = ['المساهم', 'الرقم الوطني', 'مبلغ الاستثمار', 'عدد الأيام', 'الربح المحسوب', 'الحالة'];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF28a745' }
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Data rows
    distributions.forEach((dist, index) => {
      const row = worksheet.getRow(11 + index);
      row.values = [
        dist.investorId.fullName,
        dist.investorId.nationalId,
        `${dist.calculation.investmentAmount.toLocaleString()} ${dist.currency}`,
        dist.calculation.totalDays,
        `${dist.calculation.calculatedProfit.toLocaleString()} ${dist.currency}`,
        dist.status === 'calculated' ? 'محسوب' : 
        dist.status === 'approved' ? 'موافق عليه' : 
        dist.status === 'distributed' ? 'موزع' : dist.status
      ];
      
      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' }
        };
      }
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Save file
    const fileName = `profit-distribution-${financialYear.year}-${Date.now()}.xlsx`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    
    await workbook.xlsx.writeFile(filePath);
    
    return { fileName, filePath };
    
  } catch (error) {
    throw error;
  }
};

/**
 * Export investor report to PDF
 */
const exportInvestorReportToPDF = async (investor, transactions, profitDistributions, summary) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `investor-report-${investor.fullName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      const filePath = path.join(EXPORTS_DIR, fileName);
      
      // Create write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Title
      doc.fontSize(18)
         .text(`تقرير المساهم الفردي`, 50, 50, {
           align: 'center',
           width: 500
         });
      
      doc.fontSize(16)
         .text(investor.fullName, 50, 80, {
           align: 'center',
           width: 500
         });
      
      // Investor info
      let currentY = 120;
      doc.fontSize(14)
         .text('معلومات المساهم:', 50, currentY);
      
      currentY += 25;
      doc.fontSize(11);
      
      addArabicText(doc, `الاسم: ${investor.fullName}`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `الرقم الوطني: ${investor.nationalId}`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `مبلغ المساهمة: ${investor.amountContributed.toLocaleString()} IQD`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `نسبة المساهمة: ${investor.sharePercentage}%`, 70, currentY);
      currentY += 30;
      
      // Summary
      doc.fontSize(14)
         .text('ملخص الحساب:', 50, currentY);
      
      currentY += 25;
      doc.fontSize(11);
      
      addArabicText(doc, `الفترة: ${summary.year}`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `إجمالي الإيداعات: ${summary.totalDeposits.toLocaleString()} IQD`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `إجمالي السحوبات: ${summary.totalWithdrawals.toLocaleString()} IQD`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `إجمالي الأرباح: ${summary.totalProfits.toLocaleString()} IQD`, 70, currentY);
      currentY += 20;
      addArabicText(doc, `الرصيد الحالي: ${summary.currentBalance.toLocaleString()} IQD`, 70, currentY);
      currentY += 40;
      
      // Profit distributions table
      if (profitDistributions.length > 0) {
        doc.fontSize(14)
           .text('توزيعات الأرباح:', 50, currentY);
        
        currentY += 25;
        
        const headers = ['السنة المالية', 'مبلغ الاستثمار', 'عدد الأيام', 'الربح المحسوب', 'الحالة'];
        const colWidths = [100, 100, 80, 100, 120];
        
        currentY = createTableHeader(doc, headers, currentY, colWidths);
        
        profitDistributions.forEach((dist, index) => {
          const row = [
            dist.financialYearId?.year?.toString() || 'N/A',
            `${dist.calculation.investmentAmount.toLocaleString()} ${dist.currency}`,
            dist.calculation.totalDays.toString(),
            `${dist.calculation.calculatedProfit.toLocaleString()} ${dist.currency}`,
            dist.status === 'calculated' ? 'محسوب' : 
            dist.status === 'approved' ? 'موافق عليه' : 
            dist.status === 'distributed' ? 'موزع' : dist.status
          ];
          
          currentY = createTableRow(doc, row, currentY, colWidths, index % 2 === 0);
          
          // Add new page if needed
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
            currentY = createTableHeader(doc, headers, currentY, colWidths);
          }
        });
        
        currentY += 30;
      }
      
      // Transactions table
      if (transactions.length > 0) {
        // Add new page if needed
        if (currentY > 600) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fontSize(14)
           .text('المعاملات المالية:', 50, currentY);
        
        currentY += 25;
        
        const headers = ['التاريخ', 'النوع', 'المبلغ', 'المرجع', 'الملاحظات'];
        const colWidths = [80, 80, 100, 100, 140];
        
        currentY = createTableHeader(doc, headers, currentY, colWidths);
        
        transactions.slice(0, 20).forEach((transaction, index) => { // Limit to first 20 transactions
          const row = [
            new Date(transaction.transactionDate).toLocaleDateString('ar-SA'),
            transaction.type === 'deposit' ? 'إيداع' : 
            transaction.type === 'withdrawal' ? 'سحب' : 
            transaction.type === 'profit' ? 'أرباح' : transaction.type,
            `${transaction.amount.toLocaleString()} IQD`,
            transaction.reference || '-',
            transaction.notes || '-'
          ];
          
          currentY = createTableRow(doc, row, currentY, colWidths, index % 2 === 0);
          
          // Add new page if needed
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
            currentY = createTableHeader(doc, headers, currentY, colWidths);
          }
        });
      }
      
      // Footer
      doc.fontSize(10)
         .text(`تم إنشاء التقرير في: ${new Date().toLocaleString('ar-SA')}`, 50, doc.page.height - 50, {
           align: 'center',
           width: 500
         });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ fileName, filePath });
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Clean up old export files (older than 24 hours)
 */
const cleanupOldExports = () => {
  try {
    const files = fs.readdirSync(EXPORTS_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    files.forEach(file => {
      const filePath = path.join(EXPORTS_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`تم حذف الملف القديم: ${file}`);
      }
    });
  } catch (error) {
    console.error('خطأ في تنظيف الملفات القديمة:', error);
  }
};

module.exports = {
  exportProfitDistributionToPDF,
  exportProfitDistributionToExcel,
  exportInvestorReportToPDF,
  cleanupOldExports
}; 