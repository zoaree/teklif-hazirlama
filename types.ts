
export interface CatalogFile {
  id: string;
  file: File;
  base64: string;
}

export interface RequestFile {
  id: string;
  file: File;
  base64: string;
  type: 'image' | 'pdf' | 'excel';
}

export interface BankAccount {
  id: string;
  bankName: string;
  currency: string;
  iban: string;
  isVisible: boolean; 
}

export interface BrandDiscount {
  brandName: string;
  discountRate: number;
}

export interface CustomerInfo {
  name: string;
  attentionTo: string; 
  taxInfo?: string;
  address?: string;
}

export interface QuoteItem {
  stockCode: string;
  originalRequest: string;
  catalogName: string;
  brand: string; 
  category: string; 
  quantity: number;
  unit: string; 
  listPrice: number;
  discountRate: number; 
  netPrice: number;
  currency: string;
  total: number;
  found: boolean;
  notes?: string;
}

export interface PartnerLogo {
    id: string;
    base64: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  deliveryTerms: string;
  validityDays: number;
  logoBase64?: string;
  themeColor: string; // Hex code
  services: string[]; // List of services provided
  partnerLogos: PartnerLogo[];
  bankAccounts: BankAccount[];
  brandDiscounts: BrandDiscount[]; 
  defaultDiscount: number; 
}

// New: For persistent storage
export interface SavedQuote {
  id: string;
  date: string;
  customerName: string;
  items: QuoteItem[];
  globalDiscount: number;
  vatRate: number;
  totalSummary: string; // Brief summary for list view (e.g. "1500 TL + 200 USD")
}

// New: For optimized catalog memory
export interface CatalogIndex {
    id: string;
    date: string;
    content: string; // CSV/Text representation of the catalogs
    fileNames: string[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  INDEXING = 'INDEXING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
