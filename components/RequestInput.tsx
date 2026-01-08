
import React, { useRef } from 'react';
import { AppStatus, RequestFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface RequestInputProps {
  request: string;
  setRequest: (req: string) => void;
  requestFiles: RequestFile[];
  setRequestFiles: (files: RequestFile[]) => void;
  onAnalyze: () => void;
  status: AppStatus;
  disabled: boolean;
  isRevision?: boolean; 
}

export const RequestInput: React.FC<RequestInputProps> = ({ 
    request, setRequest, 
    requestFiles, setRequestFiles,
    onAnalyze, status, disabled, isRevision 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files.length > 0) {
          try {
              const newFiles: RequestFile[] = [];
              for (let i = 0; i < e.target.files.length; i++) {
                  const file = e.target.files[i];
                  const base64 = await fileToBase64(file);
                  
                  let type: 'image' | 'pdf' | 'excel' = 'image';
                  if (file.type.includes('pdf')) type = 'pdf';
                  else if (file.type.includes('sheet') || file.type.includes('excel')) type = 'excel';
                  
                  newFiles.push({
                      id: crypto.randomUUID(),
                      file: file,
                      base64: base64,
                      type: type
                  });
              }
              // Append new files to existing ones
              setRequestFiles([...requestFiles, ...newFiles]);
          } catch(err) {
              console.error(err);
              alert("Dosyalar yüklenemedi.");
          }
      }
      // Reset input so same file can be selected again if needed
      if(e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
      const newFiles = [...requestFiles];
      newFiles.splice(index, 1);
      setRequestFiles(newFiles);
  };

  const clearAllFiles = () => {
      setRequestFiles([]);
  };

  const getFileIcon = (type: string) => {
      if (type === 'pdf') return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      );
      if (type === 'excel') return (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      );
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      );
  };

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border h-full flex flex-col transition-colors ${isRevision ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
      <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${isRevision ? 'text-orange-800' : 'text-gray-800'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRevision ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"} />
        </svg>
        {isRevision ? "2. Revize / Düzenleme Talebi" : "2. Müşteri Talebi"}
      </h2>
      
      <p className="text-sm text-gray-600 mb-3">
        {isRevision 
            ? "Mevcut listeye ne yapmak istersin? (Örn: 'Listeye 50m boru ekle' veya 'Vana adetlerini 10 yap')" 
            : "Müşteriden gelen malzeme listesini (Excel, PDF veya Fotoğraf) yükleyin."}
      </p>

      {/* Files Preview Grid */}
      {requestFiles.length > 0 && (
          <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-500">{requestFiles.length} Dosya Seçildi</span>
                  <button onClick={clearAllFiles} className="text-xs text-red-500 hover:text-red-700 underline">Tümünü Sil</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1 border border-gray-100 rounded-lg bg-gray-50">
                  {requestFiles.map((file, idx) => (
                      <div key={idx} className="relative group p-2 bg-white border border-gray-200 rounded flex items-center gap-2 overflow-hidden shadow-sm">
                          <div className="flex-shrink-0">
                             {file.type === 'image' ? (
                                 <img src={`data:image/jpeg;base64,${file.base64}`} className="w-8 h-8 object-cover rounded" alt="preview" />
                             ) : getFileIcon(file.type)}
                          </div>
                          <div className="min-w-0 flex-grow">
                              <p className="text-[10px] font-medium truncate text-gray-700">{file.file.name}</p>
                              <p className="text-[9px] text-gray-400 uppercase">{file.type}</p>
                          </div>
                          <button 
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="flex-grow flex flex-col gap-2 mb-4">
          <textarea
            className="flex-grow w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
            placeholder={isRevision ? "Örn: 20'lik boruları listeden çıkar." : "Veya buraya yazın: Örn: 100 mt 20'lik pimaş boru..."}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            disabled={status === AppStatus.PROCESSING || status === AppStatus.INDEXING}
          />
          
          {!isRevision && (
              <div className="flex justify-end">
                   <input 
                    type="file" 
                    multiple 
                    accept="image/*,.pdf,.xlsx,.xls" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                   />
                   <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={status === AppStatus.PROCESSING || status === AppStatus.INDEXING}
                        className="text-xs flex items-center gap-1 text-gray-700 hover:text-blue-600 font-bold px-3 py-2 rounded bg-gray-50 hover:bg-gray-100 border border-gray-300 shadow-sm transition-all"
                   >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                       Dosya Ekle (Foto, PDF, Excel)
                   </button>
              </div>
          )}
      </div>

      <button
        onClick={onAnalyze}
        disabled={disabled || status === AppStatus.PROCESSING || status === AppStatus.INDEXING || (!request.trim() && requestFiles.length === 0)}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white shadow-md transition-all flex items-center justify-center gap-2
          ${(disabled || (!request.trim() && requestFiles.length === 0))
            ? 'bg-gray-400 cursor-not-allowed' 
            : status === AppStatus.PROCESSING 
              ? 'bg-blue-400 cursor-wait' 
              : isRevision 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.99]'
          }`}
      >
        {status === AppStatus.PROCESSING ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Fiyatlandırılıyor ve Kontrol Ediliyor...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRevision ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"} />
            </svg>
            {isRevision ? "Teklifi Revize Et" : "Teklif Oluştur"}
          </>
        )}
      </button>
    </div>
  );
};
