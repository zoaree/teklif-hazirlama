
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
        const listPrice = Number(field === 'listPrice' ? value : item.listPrice);
        const quantity = Number(field === 'quantity' ? value : item.quantity);
        const discountRate = Number(field === 'discountRate' ? value : item.discountRate);
        
        const netPrice = listPrice * (1 - discountRate / 100);
        const total = Math.round((netPrice * quantity) * 100) / 100;
        
        item.listPrice = listPrice;
        item.quantity = quantity;
        item.discountRate = discountRate;
        item.netPrice = Number(netPrice.toFixed(4));
        item.total = total;
        
        if(listPrice > 0) item.found = true;
    }

    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const currencies: string[] = Array.from(new Set(items.map(i => i.currency).filter((c): c is string => !!c)));
  
  const calculateCurrencyTotals = (curr: string) => {
      const filtered = items.filter(i => i.currency === curr && i.found);
      const grossTotal = filtered.reduce((sum, item) => sum + (item.quantity * item.listPrice), 0);
      const netTotalLines = filtered.reduce((sum, item) => sum + item.total, 0);
      
      const lineDiscountAmount = grossTotal - netTotalLines;
      const globalDiscountAmount = netTotalLines * (globalDiscount / 100);
      const totalDiscount = lineDiscountAmount + globalDiscountAmount;
      
      const taxableAmount = grossTotal - totalDiscount;
      const vatAmount = Math.round((taxableAmount * (vatRate / 100)) * 100) / 100;
      const grandTotal = Math.round((taxableAmount + vatAmount) * 100) / 100;

      return { grossTotal, totalDiscount, taxableAmount, vatAmount, grandTotal };
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden flex flex-col h-full">
      {/* Clean Blue Header */}
      <div className="p-4 border-b border-blue-100 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white backdrop-blur-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
                <h2 className="text-lg font-bold uppercase tracking-tight text-white leading-tight">TEKLİF ÇALIŞMA MASASI</h2>
                <p className="text-[10px] text-blue-100 font-medium uppercase tracking-wider">Teknik Doğrulama Denetimi Aktif</p>
            </div>
        </div>
        <div className="flex gap-2">
            {onSave && (
                <button onClick={onSave} className="text-[11px] font-bold bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-lg transition-all active:scale-95">
                    KAYDET
                </button>
            )}
            <button onClick={() => exportToExcel(items, settings, customerInfo, globalDiscount, vatRate)} className="text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-95">
                EXCEL ÇIKTI
            </button>
            <button 
                onClick={() => {
                    setIsExporting(true);
                    exportToPdf(items, settings, customerInfo, globalDiscount, vatRate).finally(() => setIsExporting(false));
                }} 
                disabled={isExporting}
                className={`text-[11px] font-bold bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-95 ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isExporting ? "İŞLENİYOR..." : "PDF OLARAK PAYLAŞ"}
            </button>
        </div>
      </div>

      {/* Clean Table Body */}
      <div className="overflow-auto flex-grow bg-white custom-scrollbar">
        <table className="min-w-full divide-y divide-blue-50">
          <thead className="bg-blue-50/50 sticky top-0 z-10 border-b border-blue-100">
            <tr>
              <th className="px-4 py-3 text-center text-[11px] font-bold text-blue-700 uppercase tracking-wider">No</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-blue-700 uppercase tracking-wider">Marka</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-blue-700 uppercase tracking-wider">Ürün Tanımı</th>
              <th className="px-4 py-3 text-right text-[11px] font-bold text-blue-700 uppercase tracking-wider">Miktar</th>
              <th className="px-4 py-3 text-right text-[11px] font-bold text-blue-700 uppercase tracking-wider">Birim Fiyat</th>
              <th className="px-4 py-3 text-center text-[11px] font-bold text-blue-700 uppercase tracking-wider">İsk%</th>
              <th className="px-4 py-3 text-right text-[11px] font-bold text-blue-700 uppercase tracking-wider">Net Tutar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx} className={`group transition-all hover:bg-blue-50/30 ${!item.found ? 'bg-red-50/50' : 'bg-white'}`}>
                <td className="px-4 py-3 text-center text-[11px] font-bold text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3">
                   <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-tight">{item.brand || "---"}</span>
                </td>
                <td className="px-4 py-3">
                    <div className="flex flex-col">
                        <span className={`text-sm font-semibold leading-tight ${!item.found ? 'text-red-700' : 'text-slate-800'}`}>
                            {item.catalogName || item.originalRequest}
                        </span>
                        {item.notes && <span className="text-[10px] text-blue-600 font-medium mt-1 italic">{item.notes}</span>}
                        {!item.found && <span className="text-[9px] text-red-600 font-bold uppercase mt-1">Lütfen Manuel Fiyat Girin</span>}
                    </div>
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                        <input 
                            type="number"
                            className="w-16 text-right border border-gray-200 focus:border-blue-400 rounded px-1.5 py-1 text-sm font-bold outline-none"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{item.unit || 'AD'}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                        <input 
                            type="number"
                            step="0.01"
                            className={`w-28 text-right border rounded px-1.5 py-1 text-sm font-bold outline-none transition-all ${!item.found ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-slate-800'}`}
                            value={item.listPrice}
                            onChange={(e) => updateItem(idx, 'listPrice', e.target.value)}
                        />
                        <span className="text-[10px] text-gray-500 font-bold">{item.currency || 'TL'}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center">
                    <input 
                         type="number" 
                         className="w-14 border border-emerald-200 rounded px-1 py-1 text-xs text-center font-bold text-emerald-700 bg-emerald-50 focus:border-emerald-400 outline-none"
                         value={item.discountRate}
                         onChange={(e) => updateItem(idx, 'discountRate', e.target.value)}
                     />
                </td>
                <td className="px-4 py-3 text-right font-bold text-sm text-slate-800">
                  <div className="flex flex-col items-end">
                    <span>{formatNum(item.total)}</span>
                    <span className="text-[9px] text-gray-400 uppercase">{item.currency || 'TL'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Professional Footer */}
      <div className="bg-gray-50 border-t border-blue-100 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
              {/* Settings Panel */}
              <div className="w-full lg:w-auto space-y-4">
                  <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    TEKLİF KONTROL PANELİ
                  </h4>
                  <div className="flex flex-wrap gap-6 p-4 bg-white rounded-xl border border-blue-50 shadow-sm">
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Global İskonto (%)</label>
                          <div className="relative">
                            <input type="number" className="w-32 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xl font-bold text-emerald-600 outline-none focus:border-emerald-400" value={globalDiscount} onChange={(e) => setGlobalDiscount(Number(e.target.value))} />
                            <span className="absolute right-3 top-2 text-xl text-gray-300 font-bold">%</span>
                          </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">KDV Uygulaması</label>
                          <select className="w-40 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-blue-400" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>
                            <option value="0">KDV HARİÇ</option>
                            <option value="10">%10 KDV</option>
                            <option value="20">%20 KDV</option>
                          </select>
                      </div>
                  </div>
              </div>

              {/* Summary Cards */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-end flex-grow w-full">
                  {currencies.map((curr: string) => {
                      const t = calculateCurrencyTotals(curr);
                      return (
                        <div key={curr} className="min-w-[320px] bg-white rounded-2xl p-6 border border-blue-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{curr} HESABI</span>
                                <div className="bg-blue-50 text-blue-600 text-[9px] px-2 py-1 rounded-full font-bold uppercase">Kesin Döküm</div>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 uppercase text-[9px] font-bold">ARA TOPLAM</span>
                                    <span className="text-gray-700 font-bold">{formatNum(t.grossTotal)} {curr}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-500">
                                    <span className="text-red-400 uppercase text-[9px] font-bold">TOPLAM İSKONTO</span>
                                    <span className="font-bold">-{formatNum(t.totalDiscount)} {curr}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-700 pt-2 border-t border-gray-50">
                                    <span className="uppercase text-[9px] font-bold">MATRAH</span>
                                    <span className="text-sm font-bold">{formatNum(t.taxableAmount)} {curr}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400">
                                    <span className="uppercase text-[9px] font-bold">KDV (%{vatRate})</span>
                                    <span className="font-medium">+{formatNum(t.vatAmount)} {curr}</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-blue-50 flex justify-between items-baseline">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">GENEL TOPLAM</span>
                                <span className="text-2xl text-blue-700 font-extrabold tracking-tight">
                                    {formatNum(t.grandTotal)} <small className="text-[10px] font-bold text-gray-400">{curr}</small>
                                </span>
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
