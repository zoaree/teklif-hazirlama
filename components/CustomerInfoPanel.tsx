import React from 'react';
import { CustomerInfo } from '../types';

interface CustomerInfoPanelProps {
  info: CustomerInfo;
  setInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
}

export const CustomerInfoPanel: React.FC<CustomerInfoPanelProps> = ({ info, setInfo }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        Müşteri Bilgileri
      </h2>
      <div className="space-y-3">
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Müşteri / Firma Adı</label>
            <input 
                type="text"
                placeholder="Örn: ABC İnşaat A.Ş."
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={info.name}
                onChange={(e) => setInfo({...info, name: e.target.value})}
            />
        </div>
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">İlgili Kişi / Ünvan</label>
            <input 
                type="text"
                placeholder="Örn: Sayın Ahmet Yılmaz"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={info.attentionTo}
                onChange={(e) => setInfo({...info, attentionTo: e.target.value})}
            />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vergi Dairesi / No</label>
                <input 
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={info.taxInfo || ''}
                    onChange={(e) => setInfo({...info, taxInfo: e.target.value})}
                />
            </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Şehir / Adres</label>
                <input 
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={info.address || ''}
                    onChange={(e) => setInfo({...info, address: e.target.value})}
                />
            </div>
        </div>
      </div>
    </div>
  );
};
