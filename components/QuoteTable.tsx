
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
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-900 overflow-hidden flex flex-col h-full">
      {/* High Contrast Industrial Header */}
      <div className="p-6 border-b-4 border-slate-900 flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white">
        <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-tight">TEKLİF ÇALIŞMA MASASI</h2>
                <p className="text-xs text-blue-400 font-black uppercase tracking-[0.2em]">Katalog Eşleşme ve Doğrulama Denetimi Aktif</p>
            </div>
        </div>
        <div className="flex gap-4">
            {onSave && (
                <button onClick={onSave} className="text-xs font-black bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 text-white px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95">
                    KAYDET
                </button>
            )}
            <button onClick={() => exportToExcel(items, settings, customerInfo, globalDiscount, vatRate)} className="text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> EXCEL ÇIKTI
            </button>
            <button 
                onClick={() => {
                    setIsExporting(true);
                    exportToPdf(items, settings, customerInfo, globalDiscount, vatRate).finally(() => setIsExporting(false));
                }} 
                disabled={isExporting}
                className={`text-xs font-black bg-blue-700 hover:bg-blue-800 text-white px-7 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
            >
                {isExporting ? "İŞLENİYOR..." : "PDF OLARAK PAYLAŞ"}
            </button>
        </div>
      </div>

      {/* High Contrast Table Body */}
      <div className="overflow-auto flex-grow bg-slate-50 custom-scrollbar">
        <table className="min-w-full divide-y-2 divide-slate-800 border-separate border-spacing-0">
          <thead className="bg-slate-200 sticky top-0 z-10 border-b-4 border-slate-900 shadow-xl">
            <tr>
              <th className="px-5 py-6 text-center text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400 w-16">No</th>
              <th className="px-5 py-6 text-left text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400 w-32">Marka</th>
              <th className="px-5 py-6 text-left text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400">Ürün Tanımı</th>
              <th className="px-5 py-6 text-right text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400 w-28">Miktar</th>
              <th className="px-5 py-6 text-right text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400 w-44">Birim Liste Fiyatı</th>
              <th className="px-5 py-6 text-center text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400 w-24">İsk%</th>
              <th className="px-5 py-6 text-right text-[12px] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-400 w-52">Net Tutar</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-slate-100">
            {items.map((item, idx) => (
              <tr key={idx} className={`group transition-all hover:bg-blue-50/60 ${!item.found ? 'bg-red-50' : 'bg-white'}`}>
                <td className="px-5 py-6 text-center text-xs font-black text-slate-400 border-b border-gray-100">{idx + 1}</td>
                <td className="px-5 py-6 border-b border-gray-100">
                   <span className="text-[11px] font-black text-slate-800 bg-slate-200 px-3 py-2 rounded-lg border border-slate-300 uppercase tracking-tighter shadow-sm">{item.brand || "BELİRTİLMEDİ"}</span>
                </td>
                <td className="px-5 py-6 border-b border-gray-100">
                    <div className="flex flex-col">
                        <span className={`text-base font-black leading-tight tracking-tight mb-2 ${!item.found ? 'text-red-700' : 'text-slate-900'}`}>
                            {item.catalogName || item.originalRequest}
                        </span>
                        {item.notes && <span className="text-[11px] text-blue-900 font-bold bg-blue-100/80 px-4 py-2 rounded-xl self-start border-2 border-blue-200 shadow-md">{item.notes}</span>}
                        {!item.found && <div className="mt-4 flex items-center gap-3 text-[11px] text-red-800 font-black uppercase tracking-[0.2em] bg-white border-4 border-red-500 px-5 py-3 rounded-2xl shadow-xl animate-pulse">
                           <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                           LÜTFEN MANUEL FİYAT GİRİŞİ YAPIN
                        </div>}
                    </div>
                </td>
                <td className="px-5 py-6 text-right border-b border-gray-100">
                    <div className="flex items-center justify-end gap-2">
                        <input 
                            type="number"
                            className="w-24 text-right bg-white border-4 border-slate-300 focus:border-blue-600 rounded-xl outline-none text-lg font-black py-2 px-3 transition-all shadow-inner"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        />
                        <span className="text-[12px] text-slate-900 font-black uppercase tracking-widest">{item.unit || 'ADET'}</span>
                    </div>
                </td>
                <td className="px-5 py-6 text-right border-b border-gray-100">
                    <div className="flex items-center justify-end gap-2">
                        <input 
                            type="number"
                            step="0.01"
                            className={`w-40 text-right bg-white border-4 rounded-xl focus:border-blue-600 outline-none text-lg font-black py-2 px-3 shadow-inner transition-all ${!item.found ? 'border-red-500 text-red-800 bg-red-50 animate-pulse' : 'border-slate-300 text-slate-900'}`}
                            value={item.listPrice}
                            onChange={(e) => updateItem(idx, 'listPrice', e.target.value)}
                        />
                        <span className="text-[12px] text-slate-900 font-black uppercase">{item.currency || 'TL'}</span>
                    </div>
                </td>
                <td className="px-5 py-6 text-center border-b border-gray-100">
                    <input 
                         type="number" 
                         className="w-20 border-4 border-emerald-400 rounded-xl px-2 py-3 text-base text-center font-black text-emerald-900 bg-emerald-50 focus:border-emerald-600 outline-none shadow-inner"
                         value={item.discountRate}
                         onChange={(e) => updateItem(idx, 'discountRate', e.target.value)}
                     />
                </td>
                <td className="px-5 py-6 text-right font-black text-xl text-slate-900 border-b border-gray-100">
                  <div className="flex flex-col items-end">
                    <span className={`tracking-tighter text-2xl ${!item.found ? 'text-red-700' : 'text-blue-900'}`}>{formatNum(item.total)}</span>
                    <span className="text-[11px] text-slate-500 uppercase tracking-widest font-black">{item.currency || 'TL'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* High Contrast Professional Footer */}
      <div className="bg-slate-950 border-t-8 border-blue-600 p-12 text-white">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-16">
              {/* Settings Panel */}
              <div className="w-full lg:w-auto">
                  <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                    TEKLİF KONTROL PANELİ
                  </h4>
                  <div className="flex flex-wrap gap-10 p-10 bg-slate-900 rounded-[3rem] border-4 border-slate-800 shadow-2xl">
                      <div className="flex flex-col gap-4">
                          <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Global İskonto (%)</label>
                          <div className="relative">
                            <input type="number" className="w-48 bg-slate-950 border-4 border-slate-700 rounded-3xl px-8 py-5 text-4xl font-black text-emerald-400 focus:ring-8 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" value={globalDiscount} onChange={(e) => setGlobalDiscount(Number(e.target.value))} />
                            <span className="absolute right-8 top-5 text-4xl text-slate-600 font-black">%</span>
                          </div>
                      </div>
                      <div className="flex flex-col gap-4">
                          <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">KDV Uygulaması</label>
                          <select className="w-56 bg-slate-950 border-4 border-slate-700 rounded-3xl px-8 py-5 text-xl font-black text-white focus:ring-8 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all cursor-pointer appearance-none" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>
                            <option value="0">KDV HARİÇ</option>
                            <option value="10">%10 KDV</option>
                            <option value="20">%20 KDV</option>
                          </select>
                      </div>
                  </div>
              </div>

              {/* Summary Cards */}
              <div className="flex flex-wrap gap-12 justify-center lg:justify-end flex-grow w-full">
                  {currencies.map((curr: string) => {
                      const t = calculateCurrencyTotals(curr);
                      return (
                        <div key={curr} className="min-w-[480px] bg-white rounded-[4rem] p-16 space-y-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-80"></div>
                            
                            <div className="relative z-10 flex justify-between items-center pb-8 border-b-4 border-slate-100">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-[0.5em]">{curr} ÖZETİ</span>
                                <div className="bg-slate-950 text-white text-[12px] px-6 py-2.5 rounded-full font-black tracking-[0.2em] shadow-2xl">KESİN DÖKÜM</div>
                            </div>

                            <div className="relative z-10 space-y-6 text-lg font-black text-slate-600">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 uppercase text-[13px] tracking-[0.3em]">ARA TOPLAM</span>
                                    <span className="text-slate-900 text-2xl font-black">{formatNum(t.grossTotal)} {curr}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600">
                                    <span className="text-red-400 uppercase text-[13px] tracking-[0.3em]">TOPLAM İSKONTO</span>
                                    <span className="text-2xl font-black">-{formatNum(t.totalDiscount)} {curr}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-900 pt-8 mt-8 border-t-4 border-slate-50">
                                    <span className="uppercase text-[13px] tracking-[0.3em]">VERGİ MATRAHI</span>
                                    <span className="text-3xl font-black">{formatNum(t.taxableAmount)} {curr}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400">
                                    <span className="uppercase text-[13px] tracking-[0.3em]">KDV (%{vatRate})</span>
                                    <span className="text-xl font-bold">+{formatNum(t.vatAmount)} {curr}</span>
                                </div>
                            </div>

                            <div className="relative z-10 pt-10 flex justify-between items-baseline border-t-8 border-slate-50">
                                <span className="text-[14px] text-slate-400 font-black uppercase tracking-[0.6em] mb-4">GENEL TOPLAM</span>
                                <span className="text-7xl text-blue-900 font-black tracking-tighter drop-shadow-2xl">
                                    {formatNum(t.grandTotal)} <small className="text-xl font-black ml-3 text-slate-400">{curr}</small>
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
