
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteItem, CompanySettings, CustomerInfo } from '../types';

// Helper: Sanitize filename (Turkish to English conversion)
const sanitizeFilename = (text: string): string => {
    if (!text) return 'Musteri';
    
    const trMap: { [key: string]: string } = {
        'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U',
        'ş': 's', 'Ş': 'S',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C'
    };
    
    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with _
        .replace(/__+/g, '_')          // Remove duplicate underscores
        .replace(/^_|_$/g, '')         // Trim leading/trailing underscores
        .substring(0, 30);             // Limit length
};

// Helper for Turkish Currency Formatting
const formatCurrency = (amount: number, currency: string = '') => {
    // Normalize TRY to TL for display
    const displayCurrency = currency === 'TRY' ? 'TL' : currency;
    
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount) + (displayCurrency ? ` ${displayCurrency}` : '');
};

// Helper: Hex to RGB for jsPDF
const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [41, 128, 185]; // Default Blue
};

// --- HELPER: Load Font for Turkish Support ---
const loadTurkishFont = async (doc: jsPDF) => {
    const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
    const fontUrlBold = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf";
    
    try {
        // Load Regular
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error('Font yüklenemedi');
        const buffer = await response.arrayBuffer();
        const binaryString = Array.from(new Uint8Array(buffer)).map(b => String.fromCharCode(b)).join("");
        doc.addFileToVFS("Roboto-Regular.ttf", binaryString);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

        // Load Bold
        const responseBold = await fetch(fontUrlBold);
        if (!responseBold.ok) throw new Error('Bold Font yüklenemedi');
        const bufferBold = await responseBold.arrayBuffer();
        const binaryStringBold = Array.from(new Uint8Array(bufferBold)).map(b => String.fromCharCode(b)).join("");
        doc.addFileToVFS("Roboto-Medium.ttf", binaryStringBold);
        doc.addFont("Roboto-Medium.ttf", "Roboto", "bold");

        doc.setFont("Roboto");
    } catch (e) {
        console.warn("Türkçe font yüklenemedi, standart font kullanılıyor.", e);
        doc.setFont("helvetica"); 
    }
};

const calculateTotals = (items: QuoteItem[], globalDiscount: number, vatRate: number) => {
    // Normalize currencies for grouping (TRY -> TL)
    const normalizedItems = items.map(i => ({...i, currency: i.currency === 'TRY' ? 'TL' : i.currency}));
    const currencies = Array.from(new Set(normalizedItems.map(i => i.currency).filter(Boolean)));
    const summary: any = {};

    currencies.forEach(curr => {
        const subtotal = normalizedItems
            .filter(i => i.currency === curr && i.found)
            .reduce((sum, item) => sum + item.total, 0);
        
        const globalDiscountAmount = subtotal * (globalDiscount / 100);
        const afterDiscount = subtotal - globalDiscountAmount;
        const vatAmount = afterDiscount * (vatRate / 100);
        const grandTotal = afterDiscount + vatAmount;

        summary[curr] = { subtotal, globalDiscountAmount, vatAmount, grandTotal };
    });
    return summary;
};

// Excel Export
export const exportToExcel = (items: QuoteItem[], settings: CompanySettings, customer: CustomerInfo, globalDiscount: number, vatRate: number) => {
    const tableData = items.map((item, index) => ({
        "No": index + 1,
        "Stok Kodu": item.stockCode || "-",
        "Marka": item.found ? (item.brand || "-") : "-",
        "Ürün Açıklaması": item.found ? item.catalogName : `${item.originalRequest} (MEVCUT DEĞİL)`,
        // "Notlar": item.notes || "", // REMOVED PER REQUEST
        "Miktar": item.quantity,
        "Birim": item.unit,
        "Birim Fiyat": item.found ? formatCurrency(item.listPrice) : 0,
        "Para Birimi": item.currency === 'TRY' ? 'TL' : item.currency,
        "Net Fiyat": item.found ? formatCurrency(item.netPrice) : 0,
        "Toplam Tutar": item.found ? formatCurrency(item.total) : 0,
        "Durum": item.found ? "Mevcut" : "ÜRÜN MEVCUT DEĞİL"
    }));

    const totals = calculateTotals(items, globalDiscount, vatRate);
    Object.keys(totals).forEach(curr => {
        const t = totals[curr];
        tableData.push({} as any); 
        tableData.push({"Ürün Açıklaması": `ARA TOPLAM (${curr})`, "Toplam Tutar": formatCurrency(t.subtotal)} as any);
        tableData.push({"Ürün Açıklaması": `GENEL İSKONTO (%${globalDiscount})`, "Toplam Tutar": formatCurrency(-t.globalDiscountAmount)} as any);
        tableData.push({"Ürün Açıklaması": `KDV (%${vatRate})`, "Toplam Tutar": formatCurrency(t.vatAmount)} as any);
        tableData.push({"Ürün Açıklaması": `GENEL TOPLAM (${curr})`, "Toplam Tutar": formatCurrency(t.grandTotal)} as any);
    });

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teklif");
    
    // Use sanitized filename
    const safeName = sanitizeFilename(customer.name);
    const fileName = `Teklif_${safeName}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};

// PDF Export - COLORFUL & SIDE-BY-SIDE TOTALS
export const exportToPdf = async (items: QuoteItem[], settings: CompanySettings, customer: CustomerInfo, globalDiscount: number, vatRate: number) => {
    const doc = new jsPDF();
    
    // 1. Load Font
    await loadTurkishFont(doc);

    const pageWidth = doc.internal.pageSize.width; // 210mm
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10; 
    const themeColor = hexToRgb(settings.themeColor || '#1e3a8a'); // Default Navy
    
    // --- HEADER ---
    // Draw colored header background
    doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    let yPos = 15;

    // Header Title (White)
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont("Roboto", "bold");
    doc.text("FİYAT TEKLİFİ", pageWidth - margin, 25, { align: "right" });
    
    // Date
    doc.setFontSize(10);
    doc.setFont("Roboto", "normal");
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - margin, 32, { align: "right" });

    // Logo or Company Name (Top Left)
    if (settings.logoBase64) {
        try {
            const imgProps = doc.getImageProperties(settings.logoBase64);
            const imgHeight = 25;
            const imgWidth = (imgProps.width * imgHeight) / imgProps.height;
            // Draw a white box behind logo if it has transparency or looks bad on color
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, 7, imgWidth + 4, imgHeight + 4, 2, 2, 'F');
            doc.addImage(settings.logoBase64, 'JPEG', margin + 2, 9, imgWidth, imgHeight);
        } catch (e) { console.warn("Logo error", e); }
    } else {
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text(settings.companyName, margin, 25);
    }

    // --- INFO SECTION ---
    yPos = 50;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Left: Customer Info
    doc.setFont("Roboto", "bold");
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text("SAYIN / FİRMA:", margin, yPos);
    doc.rect(margin, yPos + 2, 90, 0.5, 'F'); // Underline

    doc.setTextColor(0, 0, 0);
    doc.setFont("Roboto", "bold");
    doc.text(customer.name || "-", margin, yPos + 8);
    
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    if (customer.attentionTo) doc.text(`İlgili: ${customer.attentionTo}`, margin, yPos + 13);
    if (customer.taxInfo) doc.text(`Vergi D.: ${customer.taxInfo}`, margin, yPos + 18);
    if (customer.address) {
        const splitAddr = doc.splitTextToSize(customer.address, 80);
        doc.text(splitAddr, margin, yPos + 23);
    }

    // Right: Supplier Info
    const rightX = pageWidth / 2 + 10;
    doc.setFont("Roboto", "bold");
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.text("TEKLİFİ VEREN:", rightX, yPos);
    doc.rect(rightX, yPos + 2, 90, 0.5, 'F'); // Underline

    doc.setTextColor(0, 0, 0);
    doc.setFont("Roboto", "bold");
    doc.text(settings.companyName, rightX, yPos + 8);

    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.text(settings.phone || "", rightX, yPos + 13);
    doc.text(settings.email || "", rightX, yPos + 18);
    const splitCompAddr = doc.splitTextToSize(settings.address || "", 80);
    doc.text(splitCompAddr, rightX, yPos + 23);

    yPos += 35;

    // --- TABLE ---
    const tableBody = items.map((item, i) => {
        const isFound = item.found && item.listPrice > 0;
        const displayCurrency = item.currency === 'TRY' ? 'TL' : item.currency;
        
        let displayName = isFound ? item.catalogName : (item.originalRequest || "Bilinmeyen Ürün");
        
        // REMOVED NOTE APPENDING PER REQUEST
        // if (item.notes) { displayName += ... }

        return [
            i + 1, // Row Number
            item.stockCode || "-",
            item.found ? (item.brand || "-") : "-",
            displayName,
            item.quantity, 
            item.unit,
            isFound ? formatCurrency(item.listPrice) : "-",
            isFound ? `%${item.discountRate}` : "-",
            isFound ? formatCurrency(item.netPrice) : "-",
            isFound ? displayCurrency : "-",
            isFound ? formatCurrency(item.total) : "0,00"
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['No', 'Kod', 'Marka', 'Ürün Adı', 'Miktar', 'Birim', 'B.Fiyat', 'İsk', 'Net F.', 'Döviz', 'Tutar']],
        body: tableBody,
        theme: 'striped', // Colorful striped theme
        headStyles: { 
            fillColor: themeColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            font: "Roboto"
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2,
            overflow: 'linebreak',
            font: "Roboto",
            valign: 'middle',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, // No
            1: { cellWidth: 15, halign: 'left' }, // Code
            2: { cellWidth: 15, halign: 'left' }, // Brand
            3: { halign: 'left' }, // Description (Auto width)
            4: { cellWidth: 10 }, // Qty
            5: { cellWidth: 10 }, // Unit
            6: { cellWidth: 16, halign: 'right' }, // List Price
            7: { cellWidth: 12 }, // Disc - INCREASED TO 12 to prevent wrapping
            8: { cellWidth: 16, halign: 'right' }, // Net
            9: { cellWidth: 10 }, // Currency
            10: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } // Total
        },
        didParseCell: function (data) {
            const rowIdx = data.row.index;
            const item = items[rowIdx];
            if (data.section === 'body' && item) {
                // Formatting for Corrections - REMOVED PER REQUEST since text is hidden
                // if(data.column.index === 3 && item.notes) { ... }

                if (!item.found || item.listPrice <= 0) {
                    // If product not found
                    if (data.column.index === 3) { 
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.column.index === 10) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontSize = 6;
                        data.cell.text = ["ÜRÜN MEVCUT DEĞİL"];
                    }
                }
            }
        },
    });

    // --- TOTALS SECTION (SIDE BY SIDE) ---
    // Increased gap from +5 to +15 as requested
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    let currentY = finalY;

    // Check if we need a new page for totals
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
    }

    const totals = calculateTotals(items, globalDiscount, vatRate);
    const currencies = Object.keys(totals);
    
    // Box dimensions
    const boxWidth = 60; // INCREASED FROM 55
    const boxHeight = 35;
    const boxGap = 5; // DECREASED FROM 10
    
    // Start X position to center the boxes
    const totalWidthNeeded = (currencies.length * boxWidth) + ((currencies.length - 1) * boxGap);
    let startX = pageWidth - margin - totalWidthNeeded; 
    // If only 1 currency, align right. If multiple, still align right block.
    if (startX < margin) startX = margin; // Safety

    // Label for totals area
    doc.setFontSize(10);
    doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.setFont("Roboto", "bold");
    doc.text("GENEL TOPLAM VE ÖZET", pageWidth - margin, currentY - 2, { align: "right" });

    // Draw Totals Boxes Side-by-Side
    currencies.forEach((curr, index) => {
        const t = totals[curr];
        const boxX = startX + (index * (boxWidth + boxGap));
        
        // Box Background
        doc.setFillColor(245, 247, 250); // Light gray
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'FD');
        
        // Header of Box
        doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
        doc.roundedRect(boxX, currentY, boxWidth, 7, 2, 2, 'F');
        // Fix corners (bottom ones shouldn't be rounded for header) - cheat by drawing rect over bottom half
        doc.rect(boxX, currentY + 3, boxWidth, 4, 'F'); 

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("Roboto", "bold");
        doc.text(`${curr} HESABI`, boxX + (boxWidth / 2), currentY + 5, { align: "center" });

        // Values
        let textY = currentY + 13;
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(7); // REDUCED FROM 8
        doc.setFont("Roboto", "normal");

        // Subtotal
        doc.text("Ara Toplam:", boxX + 2, textY);
        doc.text(formatCurrency(t.subtotal), boxX + boxWidth - 2, textY, { align: "right" });
        textY += 5;

        // Discount
        if (t.globalDiscountAmount > 0) {
            doc.setTextColor(200, 0, 0);
            doc.text(`Genel İsk. (%${globalDiscount}):`, boxX + 2, textY); // SHORTENED LABEL
            doc.text(`-${formatCurrency(t.globalDiscountAmount)}`, boxX + boxWidth - 2, textY, { align: "right" });
            textY += 5;
            doc.setTextColor(50, 50, 50);
        }

        // VAT
        doc.text(`KDV (%${vatRate}):`, boxX + 2, textY);
        doc.text(`+${formatCurrency(t.vatAmount)}`, boxX + boxWidth - 2, textY, { align: "right" });
        
        // Grand Total Line
        doc.setDrawColor(200, 200, 200);
        doc.line(boxX + 2, textY + 3, boxX + boxWidth - 2, textY + 3);
        
        // Grand Total
        textY += 8;
        doc.setFont("Roboto", "bold");
        doc.setFontSize(10);
        doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
        doc.text("TOPLAM:", boxX + 2, textY);
        doc.text(`${formatCurrency(t.grandTotal)} ${curr}`, boxX + boxWidth - 2, textY, { align: "right" });
    });

    currentY += boxHeight + 10;

    // --- FOOTER INFO (Banks, Terms, Signatures) ---
    // If running out of space, add page
    if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
    }

    // 1. Bank Accounts
    if (settings.bankAccounts && settings.bankAccounts.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont("Roboto", "bold");
        doc.text("BANKA HESAP BİLGİLERİ", margin, currentY);
        doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
        doc.line(margin, currentY + 1, margin + 40, currentY + 1);
        currentY += 5;

        const visibleBanks = settings.bankAccounts.filter(b => b.isVisible);
        // Grid layout for banks (2 columns)
        visibleBanks.forEach((bank, idx) => {
            const x = (idx % 2 === 0) ? margin : pageWidth / 2 + 5;
            const y = currentY + (Math.floor(idx / 2) * 12);
            
            doc.setFontSize(8);
            doc.setFont("Roboto", "bold");
            doc.text(bank.bankName, x, y);
            doc.setFont("Roboto", "normal");
            doc.text(`${bank.iban} (${bank.currency})`, x, y + 4);
            doc.setTextColor(100, 100, 100);
        });
        currentY += (Math.ceil(visibleBanks.length / 2) * 12) + 5;
    }

    // 2. Terms & Conditions
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont("Roboto", "bold");
    doc.text("TEKLİF ŞARTLARI VE NOTLAR", margin, currentY);
    doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.line(margin, currentY + 1, margin + 50, currentY + 1);
    currentY += 6;

    doc.setFontSize(8);
    doc.setFont("Roboto", "normal");
    const terms = [
        `Teslimat Süresi / Şekli: ${settings.deliveryTerms}`,
        `Teklif Geçerlilik Süresi: ${settings.validityDays} Gün`,
        `Ödeme Koşulları: Sipariş ile birlikte kararlaştırılacaktır.`,
    ];
    
    terms.forEach(term => {
        doc.text("• " + term, margin, currentY);
        currentY += 5;
    });

    // 3. Signatures
    currentY += 10;
    if (currentY > pageHeight - 40) { doc.addPage(); currentY = 20; }

    doc.setFontSize(8);
    doc.setFont("Roboto", "bold");
    
    // Left Sig
    doc.text("MÜŞTERİ ONAYI / KAŞE / İMZA", margin, currentY);
    doc.setDrawColor(0,0,0);
    doc.line(margin, currentY + 15, margin + 60, currentY + 15);
    
    // Right Sig
    doc.text("SATIŞ TEMSİLCİSİ / FİRMA ONAYI", pageWidth - margin - 60, currentY);
    doc.line(pageWidth - margin - 60, currentY + 15, pageWidth - margin, currentY + 15);

    // --- BOTTOM SECTION: SERVICES & PARTNER LOGOS ---
    
    // Services Section
    if (settings.services && settings.services.length > 0) {
        const bottomAreaHeight = 40; // Approx height needed for logs + services
        // Position at bottom, but above logos
        const servicesY = pageHeight - 35; 
        
        doc.setFontSize(9);
        doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
        doc.setFont("Roboto", "bold");
        doc.text("HİZMETLERİMİZ: ", margin, servicesY);
        
        doc.setFont("Roboto", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        
        // Join services with bullet points
        const servicesText = settings.services.join("  •  ");
        doc.text(servicesText, margin + 25, servicesY);
    }

    // Partner Logos
    if (settings.partnerLogos && settings.partnerLogos.length > 0) {
        const logoY = pageHeight - 25;
        const logoHeight = 10;
        const logoGap = 5;
        
        let logoX = margin;
        
        settings.partnerLogos.forEach(logo => {
            try {
                const props = doc.getImageProperties(logo.base64);
                const width = (props.width * logoHeight) / props.height;
                if (logoX + width < pageWidth - margin) {
                     doc.addImage(logo.base64, 'JPEG', logoX, logoY, width, logoHeight);
                     logoX += width + logoGap;
                }
            } catch (e) {}
        });
    }

    // Page Numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Sayfa ${i} / ${pageCount} - ${settings.companyName} Teklif Formu`, pageWidth / 2, pageHeight - 5, { align: "center" });
    }

    // Use sanitized filename
    const safeName = sanitizeFilename(customer.name);
    doc.save(`Teklif_${safeName}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`);
};
