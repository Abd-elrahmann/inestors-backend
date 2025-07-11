const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// تصدير تقرير توزيع الأرباح إلى PDF
exports.exportProfitDistributionToPDF = async (financialYear, distributions) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `profit-distribution-${financialYear.year}-${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../exports', fileName);
      
      // إنشاء مجلد التصدير إذا لم يكن موجوداً
      const exportDir = path.dirname(filePath);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // إعداد الخط العربي (إذا كان متوفراً)
      // doc.font('path/to/arabic-font.ttf'); // يمكن إضافة خط عربي هنا
      
      // عنوان التقرير
      doc.fontSize(20).text(`تقرير توزيع الأرباح - السنة المالية ${financialYear.year}`, { align: 'center' });
      doc.moveDown();
      
      // معلومات السنة المالية
      doc.fontSize(14).text(`إجمالي الربح: ${financialYear.totalProfit} ${financialYear.currency}`);
      doc.text(`معدل الربح اليومي: ${financialYear.dailyProfitRate.toFixed(6)}`);
      doc.text(`عدد المساهمين: ${distributions.length}`);
      doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`);
      doc.moveDown();
      
      // جدول التوزيعات
      doc.fontSize(16).text('تفاصيل التوزيعات:', { underline: true });
      doc.moveDown();
      
      let yPosition = doc.y;
      const tableTop = yPosition;
      const itemHeight = 25;
      
      // رؤوس الجدول
      doc.fontSize(12);
      doc.text('المساهم', 50, yPosition);
      doc.text('المبلغ المستثمر', 200, yPosition);
      doc.text('عدد الأيام', 320, yPosition);
      doc.text('الأرباح', 420, yPosition);
      doc.text('العملة', 500, yPosition);
      
      yPosition += itemHeight;
      
      // خط فاصل
      doc.moveTo(50, yPosition - 5)
         .lineTo(550, yPosition - 5)
         .stroke();
      
      // بيانات التوزيعات
      let totalDistributed = 0;
      distributions.forEach((distribution, index) => {
        if (yPosition > 700) { // صفحة جديدة
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(distribution.investorId.fullName || 'غير محدد', 50, yPosition);
        doc.text(distribution.calculation.investmentAmount.toFixed(2), 200, yPosition);
        doc.text(distribution.calculation.totalDays.toString(), 320, yPosition);
        doc.text(distribution.calculation.calculatedProfit.toFixed(2), 420, yPosition);
        doc.text(distribution.currency, 500, yPosition);
        
        totalDistributed += distribution.calculation.calculatedProfit;
        yPosition += itemHeight;
      });
      
      // خط فاصل نهائي
      doc.moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();
      
      yPosition += 10;
      
      // الإجماليات
      doc.fontSize(14).text(`إجمالي الأرباح الموزعة: ${totalDistributed.toFixed(2)} ${financialYear.currency}`, 50, yPosition);
      
      // إنهاء المستند
      doc.end();
      
      stream.on('finish', () => {
        resolve({ fileName, filePath });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
};

// تصدير تقرير توزيع الأرباح إلى Excel
exports.exportProfitDistributionToExcel = async (financialYear, distributions) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`أرباح ${financialYear.year}`);
    
    // إعداد الأعمدة
    worksheet.columns = [
      { header: 'المساهم', key: 'investorName', width: 25 },
      { header: 'الرقم الوطني', key: 'nationalId', width: 20 },
      { header: 'المبلغ المستثمر', key: 'investmentAmount', width: 18 },
      { header: 'عدد الأيام', key: 'totalDays', width: 12 },
      { header: 'معدل الربح اليومي', key: 'dailyRate', width: 18 },
      { header: 'الأرباح المحسوبة', key: 'calculatedProfit', width: 18 },
      { header: 'العملة', key: 'currency', width: 10 },
      { header: 'الحالة', key: 'status', width: 15 }
    ];
    
    // تنسيق رأس الجدول
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center' };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // إضافة البيانات
    let totalDistributed = 0;
    distributions.forEach(distribution => {
      worksheet.addRow({
        investorName: distribution.investorId.fullName || 'غير محدد',
        nationalId: distribution.investorId.nationalId || 'غير محدد',
        investmentAmount: distribution.calculation.investmentAmount,
        totalDays: distribution.calculation.totalDays,
        dailyRate: distribution.calculation.dailyProfitRate,
        calculatedProfit: distribution.calculation.calculatedProfit,
        currency: distribution.currency,
        status: distribution.status === 'calculated' ? 'محسوب' : 
                distribution.status === 'approved' ? 'موافق عليه' :
                distribution.status === 'distributed' ? 'موزع' : 'مدور'
      });
      
      totalDistributed += distribution.calculation.calculatedProfit;
    });
    
    // إضافة صف الإجماليات
    const totalRow = worksheet.addRow({
      investorName: 'الإجمالي',
      investmentAmount: '',
      totalDays: '',
      dailyRate: '',
      calculatedProfit: totalDistributed,
      currency: financialYear.currency,
      status: ''
    });
    
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // إضافة ورقة معلومات السنة المالية
    const infoSheet = workbook.addWorksheet('معلومات السنة المالية');
    infoSheet.addRow(['السنة المالية', financialYear.year]);
    infoSheet.addRow(['إجمالي الربح', financialYear.totalProfit]);
    infoSheet.addRow(['العملة', financialYear.currency]);
    infoSheet.addRow(['تاريخ البداية', financialYear.startDate.toLocaleDateString('ar-SA')]);
    infoSheet.addRow(['تاريخ النهاية', financialYear.endDate.toLocaleDateString('ar-SA')]);
    infoSheet.addRow(['عدد الأيام', financialYear.totalDays]);
    infoSheet.addRow(['معدل الربح اليومي', financialYear.dailyProfitRate]);
    infoSheet.addRow(['عدد المساهمين', distributions.length]);
    infoSheet.addRow(['إجمالي الأرباح الموزعة', totalDistributed]);
    infoSheet.addRow(['تاريخ التقرير', new Date().toLocaleDateString('ar-SA')]);
    
    // تنسيق ورقة المعلومات
    infoSheet.getColumn(1).width = 25;
    infoSheet.getColumn(2).width = 20;
    infoSheet.getColumn(1).font = { bold: true };
    
    // حفظ الملف
    const fileName = `profit-distribution-${financialYear.year}-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../exports', fileName);
    
    // إنشاء مجلد التصدير إذا لم يكن موجوداً
    const exportDir = path.dirname(filePath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    await workbook.xlsx.writeFile(filePath);
    
    return { fileName, filePath };
    
  } catch (error) {
    throw error;
  }
};

// تصدير تقرير المساهم إلى PDF
exports.exportInvestorReportToPDF = async (investor, transactions, profitDistributions, summary) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `investor-report-${investor.nationalId}-${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../exports', fileName);
      
      // إنشاء مجلد التصدير إذا لم يكن موجوداً
      const exportDir = path.dirname(filePath);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // عنوان التقرير
      doc.fontSize(20).text(`تقرير المساهم - ${investor.fullName}`, { align: 'center' });
      doc.moveDown();
      
      // معلومات المساهم
      doc.fontSize(14).text(`الرقم الوطني: ${investor.nationalId}`);
      doc.text(`المساهمة الأولية: ${investor.amountContributed}`);
      doc.text(`تاريخ بداية المساهمة: ${investor.startDate.toLocaleDateString('ar-SA')}`);
      doc.text(`الحالة: ${investor.isActive ? 'نشط' : 'غير نشط'}`);
      doc.moveDown();
      
      // ملخص الحساب
      doc.fontSize(16).text('ملخص الحساب:', { underline: true });
      doc.fontSize(14).text(`إجمالي الإيداعات: ${summary.totalDeposits}`);
      doc.text(`إجمالي السحوبات: ${summary.totalWithdrawals}`);
      doc.text(`إجمالي الأرباح: ${summary.totalProfits}`);
      doc.text(`الرصيد الحالي: ${summary.currentBalance}`);
      doc.moveDown();
      
      // المعاملات
      if (transactions.length > 0) {
        doc.fontSize(16).text('المعاملات:', { underline: true });
        doc.moveDown();
        
        let yPosition = doc.y;
        
        // رؤوس جدول المعاملات
        doc.fontSize(12);
        doc.text('التاريخ', 50, yPosition);
        doc.text('النوع', 150, yPosition);
        doc.text('المبلغ', 250, yPosition);
        doc.text('المرجع', 350, yPosition);
        
        yPosition += 25;
        doc.moveTo(50, yPosition - 5).lineTo(550, yPosition - 5).stroke();
        
        transactions.slice(0, 10).forEach(transaction => { // أول 10 معاملات
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          doc.text(transaction.transactionDate.toLocaleDateString('ar-SA'), 50, yPosition);
          doc.text(transaction.type, 150, yPosition);
          doc.text(transaction.amount.toString(), 250, yPosition);
          doc.text(transaction.reference || '', 350, yPosition);
          
          yPosition += 20;
        });
        
        if (transactions.length > 10) {
          doc.text(`... و ${transactions.length - 10} معاملة أخرى`, 50, yPosition);
        }
      }
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ fileName, filePath });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
};

// تنظيف الملفات القديمة
exports.cleanupOldExports = () => {
  try {
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) return;
    
    const files = fs.readdirSync(exportDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    
    files.forEach(file => {
      const filePath = path.join(exportDir, file);
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