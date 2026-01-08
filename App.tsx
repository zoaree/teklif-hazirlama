
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CatalogManager } from './components/CatalogManager';
import { RequestInput } from './components/RequestInput';
import { QuoteTable } from './components/QuoteTable';
import { SettingsModal } from './components/SettingsModal';
import { CustomerInfoPanel } from './components/CustomerInfoPanel';
import { QuoteHistory } from './components/QuoteHistory';
import { CatalogFile, QuoteItem, AppStatus, CompanySettings, CustomerInfo, SavedQuote, CatalogIndex, RequestFile } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [files, setFiles] = useState<CatalogFile[]>([]);
  const [catalogIndex, setCatalogIndex] = useState<CatalogIndex | null>(null);
  
  const [requestText, setRequestText] = useState<string>("");
  // CHANGED: Supports various file types (PDF, Excel, Images)
  const [requestFiles, setRequestFiles] = useState<RequestFile[]>([]);
  
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(20);

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('proQuoteSettings');
    return saved ? JSON.parse(saved) : {
        companyName: 'Firma Adınız',
        address: '',
        phone: '',
        email: '',
        website: '',
        deliveryTerms: 'Depo Teslim',
        validityDays: 7,
        themeColor: '#1e3a8a', // Default Navy Blue
        services: [],
        partnerLogos: [],
        defaultDiscount: 0,
        bankAccounts: [],
        brandDiscounts: []
    };
  });

  const [quoteHistory, setQuoteHistory] = useState<SavedQuote[]>(() => {
      const saved = localStorage.getItem('proQuoteHistory');
      return saved ? JSON.parse(saved) : [];
  });

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
      name: '',
      attentionTo: '',
      taxInfo: '',
      address: ''
  });

  useEffect(() => {
    localStorage.setItem('proQuoteSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('proQuoteHistory', JSON.stringify(quoteHistory));
  }, [quoteHistory]);

  const handleAnalyzeOrRevise = async () => {
    // If no index exists, we need files. If index exists, we can proceed without active file selection (as they are cached).
    if (files.length === 0 && !catalogIndex) {
      alert("Lütfen en az bir fiyat kataloğu yükleyin veya önceden analiz edilmiş bir veri seti kullanın.");
      return;
    }
    if (!requestText.trim() && requestFiles.length === 0) {
      alert("Lütfen talep girin veya bir liste dosyası (PDF/Excel/Foto) yükleyin.");
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setErrorMsg(null);

    try {
      let result: QuoteItem[];
      
      // DECISION: Are we creating new or revising?
      if (quoteItems.length > 0) {
          // REVISION MODE (Usually text based)
          result = await geminiService.reviseQuoteRequest(files, quoteItems, requestText, settings);
      } else {
          // NEW QUOTE MODE
          result = await geminiService.processQuoteRequest(files, catalogIndex, requestText, requestFiles, settings);
      }

      setQuoteItems(result);
      // Clear inputs but keep file state
      if (!quoteItems.length) { 
          // Only clear if it was a fresh request
          setRequestText(""); 
          setRequestFiles([]);
      }
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      setErrorMsg(err.message || "İşlem sırasında bir hata oluştu. Lütfen kataloğu analiz etmeyi deneyin veya daha kısa bir liste girin.");
    }
  };

  const saveCurrentQuote = () => {
      if(quoteItems.length === 0) return;

      const currencies = Array.from(new Set(quoteItems.map(i => i.currency).filter(Boolean)));
      const summaries = currencies.map(curr => {
          const total = quoteItems.filter(i => i.currency === curr).reduce((s, i) => s + i.total, 0);
          const final = (total * (1 - globalDiscount/100)) * (1 + vatRate/100);
          return `${final.toFixed(2)} ${curr}`;
      });

      const newQuote: SavedQuote = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          customerName: customerInfo.name,
          items: quoteItems,
          globalDiscount,
          vatRate,
          totalSummary: summaries.join(' + ')
      };

      setQuoteHistory(prev => [newQuote, ...prev]);
      alert("Teklif geçmişe kaydedildi!");
  };

  const loadQuote = (quote: SavedQuote) => {
      setQuoteItems(quote.items);
      setGlobalDiscount(quote.globalDiscount);
      setVatRate(quote.vatRate);
      setCustomerInfo(prev => ({...prev, name: quote.customerName}));
      setActiveTab('create');
      setStatus(AppStatus.SUCCESS);
  };

  const deleteQuote = (id: string) => {
      if(confirm('Bu kayıt silinecek. Emin misiniz?')) {
          setQuoteHistory(prev => prev.filter(q => q.id !== id));
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        setSettings={setSettings}
      />

      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-[1800px] mx-auto px-4 md:px-6 flex gap-6">
              <button 
                onClick={() => setActiveTab('create')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  Teklif Çalışma Masası
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  Teklif Geçmişi ({quoteHistory.length})
              </button>
          </div>
      </div>
      
      <main className="flex-grow p-4 md:p-6 max-w-[1800px] mx-auto w-full">
        
        {activeTab === 'history' && (
            <QuoteHistory history={quoteHistory} onLoad={loadQuote} onDelete={deleteQuote} />
        )}

        {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)]">
            
            {/* Left Column (Inputs) */}
            <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto pr-2 pb-10 custom-scrollbar">
                <CatalogManager 
                    files={files} 
                    setFiles={setFiles} 
                    catalogIndex={catalogIndex}
                    setCatalogIndex={setCatalogIndex}
                />
                <CustomerInfoPanel info={customerInfo} setInfo={setCustomerInfo} />
                <div className="flex-grow min-h-[300px] shrink-0">
                    <RequestInput 
                        request={requestText} 
                        setRequest={setRequestText}
                        requestFiles={requestFiles}
                        setRequestFiles={setRequestFiles}
                        onAnalyze={handleAnalyzeOrRevise}
                        status={status}
                        disabled={files.length === 0 && !catalogIndex}
                        isRevision={quoteItems.length > 0} 
                    />
                </div>
            </div>

            {/* Right Column (Table) */}
            <div className="lg:col-span-8 h-full pb-2">
                {status === AppStatus.ERROR && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm">
                    <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">Hata</p>
                        <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
                    </div>
                    </div>
                </div>
                )}

                {status === AppStatus.IDLE && quoteItems.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                    <div className="bg-blue-50 p-6 rounded-full mb-6 relative group cursor-pointer hover:bg-blue-100 transition-colors">
                        <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {catalogIndex && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-700">Satış Asistanı Hazır</h3>
                    <p className="mt-2 max-w-md text-sm text-gray-500">
                        {catalogIndex ? 
                            "Kataloglarınız hafızada yüklü. Müşteri listesini girin veya dosya (PDF/Excel) yükleyin." : 
                            "Sol menüden PDF kataloglarını yükle ve 'Katalogları İşle' butonuna basarak hızlandır."}
                    </p>
                </div>
                )}

                {(status === AppStatus.SUCCESS || status === AppStatus.PROCESSING || quoteItems.length > 0) && (
                <QuoteTable 
                    items={quoteItems} 
                    setItems={setQuoteItems} 
                    settings={settings} 
                    customerInfo={customerInfo}
                    globalDiscount={globalDiscount}
                    setGlobalDiscount={setGlobalDiscount}
                    vatRate={vatRate}
                    setVatRate={setVatRate}
                    onSave={saveCurrentQuote}
                />
                )}
            </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
