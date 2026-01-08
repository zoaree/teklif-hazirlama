
import React, { useState } from 'react';
import { QuoteItem, CompanySettings, CustomerInfo } from '../types';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';

interface QuoteTableProps {
  items: QuoteItem[];
  setItems: React.Dispatch<React.SetStateAction<QuoteItem[]>>;
  settings: CompanySettings;
  customerInfo: CustomerInfo;
  globalDiscount: number;
  setGlobalDiscount: (val: number) => void;
  vatRate: number;
  setVatRate: (val: number) => void;
  onSave?: () => void;
}

export const QuoteTable: React.FC<QuoteTableProps> = ({ 
    items, setItems, settings, customerInfo, 
    globalDiscount, setGlobalDiscount, 
    vatRate, setVatRate, onSave 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (items.length === 0) return null;

  const formatNum = (num: number) => {
      return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === 'listPrice' || field === 'quantity' || field === 'discountRate') {
        const listPrice = field === 'listPrice' ? Number(value) : item.listPrice;
        const quantity = field === 'quantity' ? Number(value) : item.quantity;
        const discountRate = field === 'discountRate' ? Number(value) : item.discountRate;
        
        const netPrice = listPrice * (1 - discountRate / 100);
        const total = netPrice * quantity;
        
        item.listPrice = listPrice;
        item.quantity = quantity;
        item.discountRate = discountRate;
        item.netPrice = Number(netPrice.toFixed(4));
        item.total = Number(total.toFixed(2));
        
        if(listPrice > 0) item.found = true;
    }

    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
      if(confirm('Bu satırı silmek istiyor musunuz?')) {
          setItems(items.filter((_, i) => i !== index));
      }
  };

  const currencies = Array.from(new Set(items.map(i => i.currency).filter((c): c is string => !!c)));
  
  const calculateCurrencyTotals = (curr: string) => {
      const subtotal = items
        .filter(i => i.currency === curr && i.found)
        .reduce((sum, item) => sum + item.total, 0);
      
      const globalDiscountAmount = subtotal * (globalDiscount / 100);
      const afterDiscount = subtotal - globalDiscountAmount;
      const vatAmount = afterDiscount * (vatRate / 100);
      const grandTotal = afterDiscount + vatAmount;

      return { subtotal, globalDiscountAmount, afterDiscount, vatAmount, grandTotal };
  };

  const handlePdfExport = async () => {
      setIsExporting(true);
      try {
          await exportToPdf(items, settings, customerInfo, globalDiscount, vatRate);
      } catch (error) {
          console.error(error);
          alert("PDF oluşturulurken bir hata oluştu.");
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col w-full h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 bg-gray-50 shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          3. Teklif Önizleme & Düzenleme
        </h2>
        <div className="flex gap-2">
            {onSave && (
                <button onClick={onSave} className="text-sm bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Kaydet
                </button>
            )}
            <button onClick={() => exportToExcel(items, settings, customerInfo, globalDiscount, vatRate)} className="text-sm bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Excel
            </button>
            <button 
                onClick={handlePdfExport} 
                disabled={isExporting}
                className={`text-sm bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isExporting ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                )}
                PDF İndir
            </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="overflow-auto flex-grow p-0 min-h-[300px]">
        <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="w-8 px-2 py-3 border-b border-gray-200"></th>
              <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase border-b border-gray-200 w-10">No</th>
              <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase border-b border-gray-200">Stok Kodu</th>
              <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase border-b border-gray-200">Marka</th>
              <th className="px-2 py-3 text-left text-xs font-bold text-gray-600 uppercase w-1/3 border-b border-gray-200">Ürün Açıklaması</th>
              <th className="px-2 py-3 text-right text-xs font-bold text-gray-600 uppercase w-20 border-b border-gray-200">Miktar</th>
              <th className="px-2 py-3 text-right text-xs font-bold text-gray-600 uppercase w-28 border-b border-gray-200">Birim F.</th>
              <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase w-16 border-b border-gray-200">İsk%</th>
              <th className="px-2 py-3 text-right text-xs font-bold text-gray-600 uppercase border-b border-gray-200">Net F.</th>
              <th className="px-2 py-3 text-right text-xs font-bold text-gray-900 uppercase border-b border-gray-200">Tutar</th>
            </tr>
          </thead>
          <tbody className="bg-white text-sm">
            {items.map((item, idx) => {
              const displayValue = item.catalogName || item.originalRequest;
              const isMissing = !item.found || !item.catalogName;

              return (
              <tr key={idx} className={`group ${!item.found ? 'bg-red-50' : 'hover:bg-blue-50'} transition-colors`}>
                <td className="px-2 py-2 text-center border-b border-gray-100">
                    <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </td>
                <td className="px-2 py-2 text-center text-gray-500 text-xs font-mono border-b border-gray-100">
                    {idx + 1}
                </td>
                <td className="px-2 py-2 border-b border-gray-100">
                  <input 
                    className="w-full bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded px-1 outline-none text-xs font-mono text-gray-600"
                    value={item.stockCode || ""}
                    onChange={(e) => updateItem(idx, 'stockCode', e.target.value)}
                  />
                </td>
                 <td className="px-2 py-2 border-b border-gray-100">
                  <input 
                    className="w-full bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded px-1 outline-none text-xs font-semibold text-blue-800"
                    value={item.brand || ""}
                    onChange={(e) => updateItem(idx, 'brand', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 border-b border-gray-100">
                    <div className="flex flex-col">
                        <input 
                            className={`w-full bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded px-1 outline-none font-medium ${isMissing ? 'text-red-600 font-bold' : 'text-gray-900'}`}
                            value={displayValue}
                            onChange={(e) => updateItem(idx, 'catalogName', e.target.value)}
                        />
                    </div>
                </td>
                <td className="px-2 py-2 text-right border-b border-gray-100">
                    <div className="flex items-center justify-end gap-1">
                        <input 
                            type="number"
                            className="w-12 text-right bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded px-1 text-gray-900 outline-none"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                        <input 
                             className="w-10 text-xs text-gray-500 bg-transparent outline-none text-right"
                             value={item.unit}
                             onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        />
                    </div>
                </td>
                <td className="px-2 py-2 text-right border-b border-gray-100">
                    <div className="flex items-center justify-end gap-1">
                        <input 
                            type="number"
                            className="w-20 text-right bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded px-1 text-gray-500 outline-none"
                            value={item.listPrice}
                            onChange={(e) => updateItem(idx, 'listPrice', e.target.value)}
                        />
                        <select
                             className="w-14 text-xs font-bold text-gray-600 bg-transparent outline-none text-right cursor-pointer hover:text-blue-600"
                             value={item.currency}
                             onChange={(e) => updateItem(idx, 'currency', e.target.value)}
                        >
                            <option value="TL">TL</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </td>
                <td className="px-2 py-2 text-center border-b border-gray-100">
                    <input 
                         type="number" 
                         className="w-10 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:ring-1 focus:ring-blue-500"
                         value={item.discountRate}
                         onChange={(e) => updateItem(idx, 'discountRate', e.target.value)}
                     />
                </td>
                <td className="px-2 py-2 text-right font-medium text-gray-700 border-b border-gray-100">
                    {item.found || item.listPrice > 0 ? formatNum(item.netPrice) : '-'}
                </td>
                <td className="px-2 py-2 text-right font-bold text-gray-900 border-b border-gray-100">
                  {item.found || item.listPrice > 0 ? `${formatNum(item.total)}` : <span className="text-red-500 text-xs font-bold">MEVCUT DEĞİL</span>}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* --- Footer Area --- */}
      <div className="bg-gray-50 border-t border-gray-200 p-4 shrink-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              
              <div className="flex gap-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Genel İskonto %</label>
                      <input 
                        type="number" 
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      />
                  </div>
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">KDV Oranı %</label>
                      <select 
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={vatRate}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                      </select>
                  </div>
              </div>

              <div className="flex flex-wrap gap-4 justify-end flex-grow">
                  {currencies.map((curr) => {
                      const totals = calculateCurrencyTotals(curr as string);
                      return (
                        <div key={curr as string} className="min-w-[220px] bg-white rounded-lg border border-blue-100 shadow-sm overflow-hidden">
                            <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-800">{curr} HESABI</span>
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="p-3 space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Ara Toplam:</span>
                                    <span>{formatNum(totals.subtotal)}</span>
                                </div>
                                {totals.globalDiscountAmount > 0 && (
                                    <div className="flex justify-between text-xs text-red-500">
                                        <span>İskonto:</span>
                                        <span>-{formatNum(totals.globalDiscountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>KDV ({vatRate}%):</span>
                                    <span>+{formatNum(totals.vatAmount)}</span>
                                </div>
                                <div className="pt-2 mt-1 border-t border-gray-100 flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-gray-800">TOPLAM:</span>
                                    <span className="text-lg font-bold text-blue-700">{formatNum(totals.grandTotal)} <span className="text-xs font-normal text-gray-400">{curr}</span></span>
                                </div>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      </div>
    </div>
  );
};
