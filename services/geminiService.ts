
import { GoogleGenAI, Type } from "@google/genai";
import { CatalogFile, QuoteItem, CompanySettings, CatalogIndex, RequestFile } from "../types";

// Removed Schema import as it is not part of the standard @google/genai public API examples and Type should be used instead.
const getSchema = (): any => ({
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      stockCode: { type: Type.STRING },
      originalRequest: { type: Type.STRING },
      catalogName: { 
        type: Type.STRING,
        description: "Katalogdan bulunan TAM ve RESMİ ÜRÜN ADI. Format: [Marka] [Ürün Adı] [Ölçü] [Tip: (SİYAH) veya (GALVANİZ)]. ASLA 'Düzeltme' yazma."
      },
      brand: { type: Type.STRING },
      category: { type: Type.STRING },
      quantity: { type: Type.NUMBER },
      unit: { type: Type.STRING },
      listPrice: { type: Type.NUMBER },
      currency: { type: Type.STRING },
      found: { type: Type.BOOLEAN },
      notes: { type: Type.STRING } 
    },
    required: ["originalRequest", "catalogName", "brand", "quantity", "unit", "listPrice", "currency", "found"]
  }
});

// Helper: Try to fix truncated JSON
const safeJsonParse = (text: string): any[] => {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.replace(/^```json/, "");
    if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```/, "");
    if (cleanText.endsWith("```")) cleanText = cleanText.replace(/```$/, "");
    cleanText = cleanText.trim();

    try {
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("JSON Parse Failed, attempting repair...", e);
        const lastObjectEnd = cleanText.lastIndexOf('}');
        if (lastObjectEnd !== -1) {
            let repaired = cleanText.substring(0, lastObjectEnd + 1);
            if (!repaired.trim().startsWith('[')) repaired = '[' + repaired;
            if (!repaired.trim().endsWith(']')) repaired = repaired + ']';
            try { return JSON.parse(repaired); } catch (e2) { console.error("JSON Repair Failed 1", e2); }
        }
        return [];
    }
};

const calculatePrices = (items: QuoteItem[], settings: CompanySettings): QuoteItem[] => {
    return items.map(item => {
        let discountRate = settings.defaultDiscount;
        if (item.found && item.brand) {
            const brandRule = settings.brandDiscounts.find(rule => 
                item.brand.toLowerCase().includes(rule.brandName.toLowerCase()) ||
                rule.brandName.toLowerCase().includes(item.brand.toLowerCase())
            );
            if (brandRule) discountRate = brandRule.discountRate;
        }
        const discountAmount = item.listPrice * (discountRate / 100);
        const netPrice = item.listPrice - discountAmount;
        const total = netPrice * item.quantity;
        const currency = item.currency === 'TRY' ? 'TL' : item.currency;

        return {
            ...item,
            currency: currency,
            discountRate: item.found ? discountRate : 0,
            netPrice: Number(netPrice.toFixed(4)),
            total: Number(total.toFixed(2))
        };
    });
};

// Process a single file to extract text data
const extractContentFromFile = async (ai: GoogleGenAI, file: CatalogFile): Promise<string> => {
    // UPDATED PROMPT: Handling Grid Layouts and Parent Headers
    const systemInstruction = `
        GÖREV: Sen "Kusursuz Görsel Katalog Okuyucususun".
        
        AMACIN: PDF'teki tüm ürünleri, özellikle "Tablo Dışı" kalan kutucukları okumak.

        === KRİTİK GÖRSEL KURALLAR ===
        
        1. **ÜST BAŞLIK BİRLEŞTİRME (EN ÖNEMLİ):**
           - Tesisat kataloglarında (Trakya Döküm vb.) ürün adı (Örn: "NİPEL" veya "MANŞON") tablonun tepesinde BÜYÜK HARFLE yazar.
           - Altındaki kutularda veya satırlarda sadece ÖLÇÜ (Örn: 1/2", 3/4") yazar.
           - **GÖREVİN:** Sadece "1/2" görüp geçme. Üstündeki başlığı bul ve birleştir -> "MANŞON 1/2".
           - Eğer bunu yapmazsan ürün "N/A" veya "Bilinmiyor" çıkar. Bunu ASLA yapma.

        2. **KUTU / GRID TARAMA:**
           - Sayfanın alt kısımlarındaki küçük tabloları (Test Manşonu, Tapa vb.) atlama.
           - Fiyatı olan HER ŞEY bir üründür. Fiyat görüyorsan mutlaka ismini bulmalısın.

        3. **SİYAH ve GALVANİZ AYRIMI:**
           - Çıktıda Ürün Adına MUTLAKA ekle: "TRAKYA DİRSEK 1 (SİYAH)" gibi.
           - Aynı satırda iki fiyat varsa: Sol=Siyah, Sağ=Galvaniz.

        ÇIKTI FORMATI:
        [KOD] [MARKA] [ÜRÜN TAM ADI + (SİYAH/GALVANİZ)] [ÖLÇÜ] = [FİYAT]
    `;

    try {
        // Fix: Flattened configuration properties and updated model to gemini-3-flash-preview.
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: { 
                parts: [
                    { inlineData: { mimeType: file.file.type, data: file.base64 } }, 
                    { text: "Tüm sayfayı oku. Sadece ölçü yazan kutuların ÜST BAŞLIĞINI bulup ürün adına ekle. (Örn: '1/2' kutusu 'NİPEL' başlığı altındaysa -> 'NİPEL 1/2' yaz). Küçük tabloları atlama." }
                ] 
            },
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 8192,
                temperature: 0.0
            }
        });
        return `--- FILE: ${file.file.name} ---\n` + (response.text || "") + "\n\n";
    } catch (e) {
        console.error(`Error processing file ${file.file.name}`, e);
        return `--- FILE: ${file.file.name} (ERROR) ---\n`;
    }
};

// --- THE AUDITOR: PRECISION ENGINEER MODE ---
const verifyQuoteItems = async (
    ai: GoogleGenAI, 
    catalogContent: string, 
    items: QuoteItem[]
): Promise<QuoteItem[]> => {
    
    // UPDATED PROMPT: Fallback mechanism for 'Not Found' items
    const verificationSystemInstruction = `
        Sen "Baş Denetçi Teklif Uzmanısın".

        GÖREVİN: Müşteri isteğini Katalog verisiyle eşleştir.

        === 1. 'MEVCUT DEĞİL' DURUMUNU ENGELLE ===
        - Eğer bir ürün için fiyat (0 TL olmayan) bulamıyorsan, hemen pes etme.
        - Müşteri "1 Test Manşonu" demiş olabilir, katalogda "Doğalgaz Test Manşonu" yazıyor olabilir. Eşleştir.
        - Katalogda fiyat görüyorsan (Örn: 49.00 TL) ama eşleştiremediysen, o fiyatı ve yanındaki en mantıklı ismi al.

        === 2. FİYAT MANTIĞI VE TİP ===
        - Müşteri GALVANİZ istiyorsa YÜKSEK fiyatı seç.
        - Müşteri SİYAH istiyorsa DÜŞÜK fiyatı seç.
        - İsimlendirme: "TRAKYA [ÜRÜN] [ÖLÇÜ] ([TİP])" formatında olmalı.

        === 3. EKONOMİK ZEKÂ ===
        - Tapa 1/2" fiyatı 16 TL, Tapa 3/4" fiyatı 21 TL ise ve sen kararsız kaldıysan; 3/4" her zaman daha pahalıdır. Mantıklı olanı seç.
        - "N/A" isim döndürme. Eğer bulamadıysan Müşterinin Orijinal İsteğini catalogName yap ama found: false olsun.

        ÇIKTI: JSON formatında.
    `;

    const itemsToVerify = items; 
    if(itemsToVerify.length === 0) return items;

    try {
        // Fix: Updated model to gemini-3-pro-preview for advanced auditing logic.
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { text: `=== REFERANS KATALOG VERİSİ (HİYERARŞİK BAŞLIKLARI DİKKATE AL) ===\n${catalogContent.substring(0, 150000)}` }, 
                    { text: `=== MÜŞTERİ LİSTESİ (BU ÜRÜNLERİ BUL) ===\n${JSON.stringify(itemsToVerify)}` }
                ]
            },
            config: {
                systemInstruction: verificationSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: getSchema(),
                temperature: 0.1, // Slight temp increase to allow fuzzy matching for hard-to-find items
            }
        });

        const verifiedItems = safeJsonParse(response.text || "[]") as QuoteItem[];
        
        return items.map(original => {
            const verified = verifiedItems.find(v => v.stockCode === original.stockCode || v.originalRequest === original.originalRequest);
            return verified ? verified : original;
        });

    } catch (e) {
        console.error("Verification failed, returning original items", e);
        return items;
    }
};

const processQuoteRequest = async (
  files: CatalogFile[],
  catalogIndex: CatalogIndex | null,
  customerRequest: string,
  requestFiles: RequestFile[],
  settings: CompanySettings
): Promise<QuoteItem[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const contentParts: any[] = [];
  let catalogSourceText = "";

  if (catalogIndex && catalogIndex.content.length > 100) {
      catalogSourceText = catalogIndex.content;
      contentParts.push({ text: `=== REFERANS KATALOG VERİTABANI ===\n\n${catalogIndex.content}` });
  } else {
      files.forEach(f => {
          contentParts.push({ text: `=== REFERANS PDF (${f.file.name}) ===` });
          contentParts.push({ inlineData: { mimeType: f.file.type, data: f.base64 } });
      });
  }

  if (requestFiles && requestFiles.length > 0) {
      requestFiles.forEach((file) => {
          let mimeType = file.file.type;
          if(mimeType.includes("excel") || mimeType.includes("spreadsheet")) mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          contentParts.push({ text: `=== MÜŞTERİ TALEP DOSYASI (${file.file.name}) ===` });
          contentParts.push({ inlineData: { mimeType: mimeType, data: file.base64 } });
      });
  }
  
  if (customerRequest.trim()) contentParts.push({ text: `=== MÜŞTERİ NOTU ===\n${customerRequest}` });

  // Initial Extraction Prompt - Human-like scanning
  const systemInstruction = `
    Sen "Tesisat Fiyatlandırma Uzmanısın".
    
    GÖREV: Müşteri talebini oku, katalogdan fiyatı bul.
    
    === GÖRSEL ZEKÂ KURALLARI ===
    1. **BAŞLIK BİRLEŞTİRME:** Katalogda ürünler genellikle bir ana başlık altında (Örn: "DİRSEKLER") listelenir ve satırlarda sadece ölçü yazar (1/2, 3/4).
       - Ürün adını oluştururken BAŞLIĞI ALMAYI UNUTMA. Sadece "1/2" dersen ne olduğu anlaşılmaz. "DİRSEK 1/2" olmalı.
    
    2. **KENARDAKİ KÜÇÜK TABLOLAR:**
       - Test Manşonu, Tapa, Rakor gibi ürünler bazen sayfanın altında küçük tablolar halindedir. Bunları GÖRMEZDEN GELME.
    
    3. **SİYAH / GALVANİZ:**
       - Eğer fiyat 0 geliyorsa, yanlış sütuna bakıyor olabilirsin. Yanındaki diğer fiyatı dene.
       - İsimlendirme: [Marka] [Ürün] [Ölçü] (SİYAH/GALVANİZ)
    
    Çıktı JSON olmalı.
  `;

  try {
    // Fix: Flattened configuration properties and updated model to gemini-3-flash-preview.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contentParts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: getSchema(),
        temperature: 0.0, 
        maxOutputTokens: 8192
      }
    });

    const initialItems = safeJsonParse(response.text || "[]") as QuoteItem[];

    // RUN THE PRECISION ENGINEER AUDITOR
    let finalItems = initialItems;
    if (catalogSourceText) {
        console.log("Running Precision Engineer Audit...");
        finalItems = await verifyQuoteItems(ai, catalogSourceText, initialItems);
    }

    return calculatePrices(finalItems, settings);
  } catch (error) {
    console.error("Gemini Quote Error:", error);
    throw error;
  }
};

const createCatalogIndex = async (files: CatalogFile[], onProgress?: (current: number, total: number) => void): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    let combinedContent = "";
    let processedCount = 0;
    for (const file of files) {
        const content = await extractContentFromFile(ai, file);
        combinedContent += content;
        processedCount++;
        if (onProgress) onProgress(processedCount, files.length);
    }
    return combinedContent;
};

const reviseQuoteRequest = async (
  files: CatalogFile[],
  currentItems: QuoteItem[],
  revisionInstruction: string,
  settings: CompanySettings
): Promise<QuoteItem[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });
  const fileParts = files.length <= 3 ? files.map(f => ({ inlineData: { mimeType: f.file.type, data: f.base64 } })) : []; 

  const systemInstruction = `Mevcut listeyi revize et.`;
  const prompt = `MEVCUT LİSTE:\n${JSON.stringify(currentItems)}\n\nREVİZE İSTEĞİ:\n${revisionInstruction}`;

  try {
    // Fix: Updated model to gemini-3-flash-preview.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...fileParts, { text: prompt }] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: getSchema(),
        temperature: 0.1,
      }
    });
    const items = safeJsonParse(response.text || "[]") as QuoteItem[];
    return calculatePrices(items, settings);
  } catch (error) {
    console.error("Revision Error:", error);
    throw error;
  }
};

export const geminiService = {
  createCatalogIndex,
  processQuoteRequest,
  reviseQuoteRequest
};
