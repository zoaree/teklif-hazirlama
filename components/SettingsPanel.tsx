import React, { useRef, useState } from 'react';
import { CompanySettings, BankAccount, BrandDiscount, PartnerLogo } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface SettingsPanelProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

type TabType = 'general' | 'contact' | 'banks' | 'brands' | 'design';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [newService, setNewService] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const partnerLogoRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setSettings({ ...settings, logoBase64: `data:${e.target.files[0].type};base64,${base64}` });
      } catch (err) {
        console.error("Logo failed", err);
      }
    }
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          try {
              const newLogos: PartnerLogo[] = [];
              for(let i=0; i<e.target.files.length; i++) {
                  const file = e.target.files[i];
                  const base64 = await fileToBase64(file);
                  newLogos.push({ id: crypto.randomUUID(), base64: `data:${file.type};base64,${base64}` });
              }
              setSettings(prev => ({ ...prev, partnerLogos: [...prev.partnerLogos, ...newLogos] }));
          } catch (err) {
              console.error(err);
          }
      }
  };

  const removePartnerLogo = (id: string) => {
      setSettings(prev => ({ ...prev, partnerLogos: prev.partnerLogos.filter(l => l.id !== id) }));
  };

  const addService = () => {
      if(newService.trim()) {
          setSettings(prev => ({ ...prev, services: [...prev.services, newService.trim()] }));
          setNewService('');
      }
  };
  
  const removeService = (idx: number) => {
      setSettings(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) }));
  };

  const addBank = () => {
    const newBank: BankAccount = {
        id: crypto.randomUUID(),
        bankName: '',
        currency: 'TL',
        iban: '',
        isVisible: true
    };
    setSettings({...settings, bankAccounts: [...settings.bankAccounts, newBank]});
  };

  const updateBank = (id: string, field: keyof BankAccount, value: any) => {
    setSettings({
        ...settings,
        bankAccounts: settings.bankAccounts.map(b => b.id === id ? { ...b, [field]: value } : b)
    });
  };

  const removeBank = (id: string) => {
    setSettings({...settings, bankAccounts: settings.bankAccounts.filter(b => b.id !== id)});
  };

  const addBrandDiscount = () => {
      setSettings({
          ...settings, 
          brandDiscounts: [...settings.brandDiscounts, { brandName: '', discountRate: 0 }]
      });
  };

  const updateBrandDiscount = (index: number, field: keyof BrandDiscount, value: any) => {
      const newDiscounts = [...settings.brandDiscounts];
      newDiscounts[index] = { ...newDiscounts[index], [field]: value };
      setSettings({ ...settings, brandDiscounts: newDiscounts });
  };

  const removeBrandDiscount = (index: number) => {
      setSettings({
          ...settings,
          brandDiscounts: settings.brandDiscounts.filter((_, i) => i !== index)
      });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {[
            { id: 'general', label: 'Genel' },
            { id: 'contact', label: 'İletişim' },
            { id: 'design', label: 'Hizmet & Partner' },
            { id: 'banks', label: 'Banka' },
            { id: 'brands', label: 'İskontolar' }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 py-3 px-2 text-xs font-medium whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div className="p-4 overflow-y-auto max-h-[500px] flex-grow">
        
        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
            <div className="space-y-4">
                <div className="flex gap-4 items-start">
                    <div className="flex-grow">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Firma Adı (Teklifi Veren)</label>
                        <input 
                            type="text" 
                            value={settings.companyName}
                            onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Firma Logosu</label>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} ref={logoInputRef} className="hidden" />
                        <div 
                            onClick={() => logoInputRef.current?.click()}
                            className="w-full h-16 border border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                            {settings.logoBase64 ? (
                                <img src={settings.logoBase64} alt="Logo" className="max-h-14 max-w-full object-contain" />
                            ) : <span className="text-[10px] text-gray-400">Yükle</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Teslim Şekli</label>
                        <input 
                            type="text" 
                            value={settings.deliveryTerms}
                            onChange={(e) => setSettings({...settings, deliveryTerms: e.target.value})}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Geçerlilik (Gün)</label>
                        <input 
                            type="number" 
                            value={settings.validityDays}
                            onChange={(e) => setSettings({...settings, validityDays: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">PDF Tema Rengi</label>
                    <div className="flex gap-2 items-center">
                        <input 
                            type="color" 
                            value={settings.themeColor || '#1e3a8a'}
                            onChange={(e) => setSettings({...settings, themeColor: e.target.value})}
                            className="w-10 h-8 p-0 border-0 rounded cursor-pointer"
                        />
                        <span className="text-xs text-gray-500">Logonuzun ana rengini seçin.</span>
                    </div>
                </div>
            </div>
        )}

        {/* TAB: CONTACT */}
        {activeTab === 'contact' && (
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Adres</label>
                    <textarea 
                        rows={3}
                        value={settings.address}
                        onChange={(e) => setSettings({...settings, address: e.target.value})}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                        <input 
                            type="text" 
                            value={settings.phone}
                            onChange={(e) => setSettings({...settings, phone: e.target.value})}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">E-Posta</label>
                        <input 
                            type="email" 
                            value={settings.email}
                            onChange={(e) => setSettings({...settings, email: e.target.value})}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Web Sitesi</label>
                    <input 
                        type="text" 
                        value={settings.website}
                        onChange={(e) => setSettings({...settings, website: e.target.value})}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                 </div>
             </div>
        )}

        {/* TAB: DESIGN & SERVICES */}
        {activeTab === 'design' && (
            <div className="space-y-6">
                {/* Services Section */}
                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase">Verdiğimiz Hizmetler</h4>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            placeholder="Örn: Proje Taahhüt, Mekanik Tesisat..." 
                            className="flex-grow border border-gray-300 rounded px-2 py-1.5 text-sm"
                            value={newService}
                            onChange={(e) => setNewService(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addService()}
                        />
                        <button onClick={addService} className="bg-blue-600 text-white px-3 rounded text-sm font-medium hover:bg-blue-700">Ekle</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {settings.services.map((svc, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1 border border-gray-200">
                                {svc}
                                <button onClick={() => removeService(idx)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Partner Logos Section */}
                <div>
                    <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase">Bayisi Olduğumuz Ürünler (Logolar)</h4>
                    <p className="text-[10px] text-gray-500 mb-2">PDF'in en alt kısmına eklenecek logoları seçin.</p>
                    <input type="file" multiple accept="image/*" onChange={handlePartnerLogoUpload} ref={partnerLogoRef} className="hidden" />
                    <button 
                        onClick={() => partnerLogoRef.current?.click()}
                        className="w-full py-2 border border-dashed border-gray-300 rounded bg-gray-50 text-gray-500 text-xs hover:bg-gray-100 mb-2"
                    >
                        + Logo Yükle
                    </button>
                    <div className="grid grid-cols-4 gap-2">
                        {settings.partnerLogos.map((logo) => (
                            <div key={logo.id} className="relative border border-gray-200 rounded p-1 h-12 flex items-center justify-center bg-white">
                                <img src={logo.base64} className="max-h-full max-w-full object-contain" />
                                <button 
                                    onClick={() => removePartnerLogo(logo.id)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* TAB: BANKS */}
        {activeTab === 'banks' && (
            <div>
                <div className="mb-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Teklif altında görünecek hesaplar:</span>
                    <button onClick={addBank} className="text-xs text-blue-600 font-medium hover:underline">+ Hesap Ekle</button>
                </div>
                <div className="space-y-3">
                    {settings.bankAccounts.map((bank) => (
                        <div key={bank.id} className="p-3 border border-gray-200 rounded bg-gray-50 relative group">
                            <button onClick={() => removeBank(bank.id)} className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    placeholder="Banka Adı (Örn: Garanti)" 
                                    className="flex-grow border border-gray-300 rounded px-2 py-1 text-xs"
                                    value={bank.bankName}
                                    onChange={(e) => updateBank(bank.id, 'bankName', e.target.value)}
                                />
                                <select 
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                                    value={bank.currency}
                                    onChange={(e) => updateBank(bank.id, 'currency', e.target.value)}
                                >
                                    <option value="TL">TL</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                            <input 
                                placeholder="IBAN (TR...)" 
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                                value={bank.iban}
                                onChange={(e) => updateBank(bank.id, 'iban', e.target.value)}
                            />
                            <div className="mt-2 flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={bank.isVisible}
                                    onChange={(e) => updateBank(bank.id, 'isVisible', e.target.checked)}
                                    id={`vis-${bank.id}`}
                                />
                                <label htmlFor={`vis-${bank.id}`} className="text-xs text-gray-600">Teklifte Göster</label>
                            </div>
                        </div>
                    ))}
                    {settings.bankAccounts.length === 0 && <div className="text-center text-xs text-gray-400 py-4">Henüz banka hesabı eklenmedi.</div>}
                </div>
            </div>
        )}

        {/* TAB: BRANDS */}
        {activeTab === 'brands' && (
            <div>
                 <div className="mb-3 bg-blue-50 p-2 rounded text-xs text-blue-700">
                    Belirlediğiniz markalar tespit edildiğinde bu iskontolar otomatik uygulanır.
                </div>
                
                {/* Default Discount */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Diğerleri için Varsayılan İskonto (%)</label>
                    <input 
                        type="number" 
                        value={settings.defaultDiscount}
                        onChange={(e) => setSettings({...settings, defaultDiscount: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-bold text-blue-600"
                    />
                </div>

                <div className="mb-2 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Özel Marka İskontoları</span>
                    <button onClick={addBrandDiscount} className="text-xs text-green-600 font-medium hover:underline">+ Kural Ekle</button>
                </div>
                
                <div className="space-y-2">
                    {settings.brandDiscounts.map((rule, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <input 
                                placeholder="Marka (Örn: Fırat)" 
                                className="flex-grow border border-gray-300 rounded px-2 py-1.5 text-xs"
                                value={rule.brandName}
                                onChange={(e) => updateBrandDiscount(idx, 'brandName', e.target.value)}
                            />
                            <div className="relative w-24">
                                <input 
                                    type="number" 
                                    placeholder="%" 
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-right pr-6"
                                    value={rule.discountRate}
                                    onChange={(e) => updateBrandDiscount(idx, 'discountRate', Number(e.target.value))}
                                />
                                <span className="absolute right-2 top-1.5 text-xs text-gray-500">%</span>
                            </div>
                            <button onClick={() => removeBrandDiscount(idx)} className="text-gray-400 hover:text-red-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                     {settings.brandDiscounts.length === 0 && <div className="text-center text-xs text-gray-400 py-2">Marka kuralı yok.</div>}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
