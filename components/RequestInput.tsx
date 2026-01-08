
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
              setRequestFiles([...requestFiles, ...newFiles]);
          } catch(err) {
              console.error(err);
              alert("Dosyalar yüklenemedi.");
          }
      }
      if(e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
      const newFiles = [...requestFiles];
      newFiles.splice(index, 1);
      setRequestFiles(newFiles);
  };

  const getFileIcon = (type: string) => {
      if (type === 'pdf') return (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      );
      if (type === 'excel') return (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      );
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      );
  };

  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm border h-full flex flex-col transition-all ${isRevision ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200'}`}>
      <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isRevision ? 'text-orange-700' : 'text-gray-700'}`}>
        <div className={`w-2 h-2 rounded-full ${isRevision ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
        {isRevision ? "REVİZE / DÜZENLEME TALEBİ" : "MÜŞTERİ MALZEME TALEBİ"}
      </h2>
      
      {/* Files Preview Row */}
      {requestFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
              {requestFiles.map((file, idx) => (
                  <div key={idx} className="relative group p-1.5 bg-white border border-gray-100 rounded-lg flex items-center gap-2 shadow-sm">
                      <div className="flex-shrink-0">
                         {file.type === 'image' ? (
                             <img src={`data:image/jpeg;base64,${file.base64}`} className="w-6 h-6 object-cover rounded" alt="preview" />
                         ) : getFileIcon(file.type)}
                      </div>
                      <span className="text-[10px] font-medium truncate max-w-[80px]">{file.file.name}</span>
                      <button onClick={() => removeFile(idx)} className="text-gray-300 hover:text-red-500">
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
              ))}
          </div>
      )}

      <div className="flex-grow flex flex-col gap-2 mb-4">
          <textarea
            className="flex-grow w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none text-sm outline-none transition-all placeholder:text-gray-300"
            placeholder={isRevision ? "Revize notlarınızı buraya yazın..." : "Malzeme listesini buraya yapıştırın veya el yazısı fotoğrafı yükleyin..."}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            disabled={status === AppStatus.PROCESSING || status === AppStatus.INDEXING}
          />
          
          {!isRevision && (
              <div className="flex justify-between items-center">
                   <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Veya Dosya Ekle:</p>
                   <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                   <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={status === AppStatus.PROCESSING || status === AppStatus.INDEXING}
                        className="text-[10px] flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all"
                   >
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                       YÜKLE (FOTO/PDF/EXCEL)
                   </button>
              </div>
          )}
      </div>

      <button
        onClick={onAnalyze}
        disabled={disabled || status === AppStatus.PROCESSING || status === AppStatus.INDEXING || (!request.trim() && requestFiles.length === 0)}
        className={`w-full py-3.5 px-6 rounded-xl font-bold text-white shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2
          ${(disabled || (!request.trim() && requestFiles.length === 0))
            ? 'bg-gray-200 cursor-not-allowed text-gray-400' 
            : status === AppStatus.PROCESSING 
              ? 'bg-blue-400 cursor-wait' 
              : isRevision 
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
          }`}
      >
        {status === AppStatus.PROCESSING ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            HESAPLANIYOR...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isRevision ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"} />
            </svg>
            {isRevision ? "REVİZE ET" : "TEKLİF OLUŞTUR"}
          </>
        )}
      </button>
    </div>
  );
};
