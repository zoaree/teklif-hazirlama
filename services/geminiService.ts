
import { GoogleGenAI, Type } from "@google/genai";
import { CatalogFile, QuoteItem, CompanySettings, CatalogIndex, RequestFile } from "../types";

const getSchema = () => ({
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      stockCode: { type: Type.STRING },
      originalRequest: { type: Type.STRING },
      catalogName: { 
        type: Type.STRING,
        description: "Katalogdaki RESMİ TEKNİK TANIM. Örn: [Marka] [Ürün] [Ölçü] [Tip]"
      },
      brand: { type: Type.STRING },
      category: { type: Type.STRING },
      quantity: { type: Type.NUMBER },
      unit: { type: Type.STRING },
      listPrice: { type: Type.NUMBER },
      currency: { type: Type.STRING },
      found: { type: Type.BOOLEAN },
      notes: { 
        type: Type.STRING,
        description: "Teknik doğrulama özeti."
      } 
    },
    required: ["originalRequest", "catalogName", "brand", "quantity", "unit", "listPrice", "currency", "found"]
  }
});

const safeJsonParse = (text: string): any[] => {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.replace(/^```json/, "");
    if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```/, "");
    if (cleanText.endsWith("```")) cleanText = cleanText.replace(/```$/, "");
    cleanText = cleanText.trim();

    try {
        const parsed = JSON.parse(cleanText);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        const lastObjectEnd = cleanText.lastIndexOf('}');
        if (lastObjectEnd !== -1) {
            let repaired = cleanText.substring(0, lastObjectEnd + 1);
            if (!repaired.trim().startsWith('[')) repaired = '[' + repaired;
            if (!repaired.trim().endsWith(']')) repaired = repaired + ']';
            try { return JSON.parse(repaired); } catch (e2) { }
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
        
        const listPrice = Number(item.listPrice);
        const quantity = Number(item.quantity);
        const disc = Number(item.discountRate || discountRate);

        const netPrice = listPrice * (1 - disc / 100);
        const total = Math.round((netPrice * quantity) * 100) / 100;

        return {
            ...item,
            discountRate: item.found ? disc : 0,
            netPrice: Number(netPrice.toFixed(4)),
            total: total,
            currency: (item.currency === 'TRY' || !item.currency) ? 'TL' : item.currency
        };
    });
};

export const geminiService = {
  createCatalogIndex: async (files: CatalogFile[], onProgress?: (current: number, total: number) => void): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    let combinedContent = "";
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const systemInstruction = `
          GÖREV: Teknik döküman analiz uzmanı olarak çalış.
          ANALİZ KRİTERLERİ:
          1. Sayfadaki tablo başlıklarını ve altındaki ölçü-fiyat kesişimlerini haritalandır.
          2. Eğer sayfa başında bir ürün tipi belirtilmişse (Örn: Dirsek 90), altındaki tüm ölçüleri bu tiple ilişkilendir.
          3. Siyah/Galvaniz gibi tip ayrımlarını fiyata göre değil, sütun hiyerarşisine göre belirle.
          AMACIN: Veriyi temiz, sorgulanabilir bir metin veritabanına dönüştürmek.
        `;
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ inlineData: { mimeType: file.file.type, data: file.base64 } }, { text: "Bu teknik döküman sayfasını parametrik bir yapıya dönüştür." }] },
                config: { systemInstruction }
            });
            combinedContent += `--- SOURCE: ${file.file.name} ---\n${response.text}\n\n`;
        } catch (e) { console.error(e); }
        if (onProgress) onProgress(i + 1, files.length);
    }
    return combinedContent;
  },

  processQuoteRequest: async (
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
    if (catalogIndex) contentParts.push({ text: `=== SİSTEM BELLEĞİ (REFERANS VERİLER) ===\n${catalogIndex.content}` });
    
    requestFiles.forEach(f => {
        contentParts.push({ text: `=== MÜŞTERİ TALEBİ / DOSYA ANALİZİ ===` });
        contentParts.push({ inlineData: { mimeType: f.file.type, data: f.base64 } });
    });

    if (customerRequest) contentParts.push({ text: `=== EK TALEPLER VE NOTLAR ===\n${customerRequest}` });

    const systemInstruction = `
      Sen kıdemli bir mühendislik teklif uzmanısın.
      
      ANALİZ PROTOKOLÜ:
      1. Müşteri talebindeki teknik terimleri ve ölçüleri (1/2, 3/4, 1 1/4 vb.) katalog verileriyle eşleştir.
      2. El yazısı dökümanlarda ölçüleri (Örn: 11/4) teknik standartlara göre yorumla (1 1/4).
      3. Katalogda fiyatı olan her kalem için en yakın ve en doğru teknik tanımı 'catalogName' alanına yaz.
      4. Eğer ürün katalogda yoksa 'found: false' olarak işaretle.
      
      ÇIKTI: Kesinlikle JSON formatında olmalıdır.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: "application/json",
          responseSchema: getSchema(),
          temperature: 0.0
        }
      });

      const initialItems = safeJsonParse(response.text || "[]") as QuoteItem[];
      return calculatePrices(initialItems, settings);
    } catch (error) { throw error; }
  },

  reviseQuoteRequest: async (
    files: CatalogFile[],
    currentItems: QuoteItem[],
    revisionInstruction: string,
    settings: CompanySettings
  ): Promise<QuoteItem[]> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `MEVCUT TEKLİF:\n${JSON.stringify(currentItems)}\n\nREVİZE TALEBİ:\n${revisionInstruction}`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          systemInstruction: "Teklif uzmanı olarak mevcut listeyi revize et ve katalog verileriyle tekrar doğrula.",
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: "application/json",
          responseSchema: getSchema(),
          temperature: 0.1
        }
      });
      return calculatePrices(safeJsonParse(response.text || "[]"), settings);
    } catch (error) { throw error; }
  }
};
