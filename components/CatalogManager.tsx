
import React, { useRef, useEffect, useState } from 'react';
import { CatalogFile, CatalogIndex, AppStatus } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import { saveCatalogsToDB, loadCatalogsFromDB, saveCatalogIndexToDB, loadCatalogIndexFromDB, clearCatalogIndexFromDB } from '../utils/storageUtils';
import { geminiService } from '../services/geminiService';

interface CatalogManagerProps {
  files: CatalogFile[];
  setFiles: React.Dispatch<React.SetStateAction<CatalogFile[]>>;
  catalogIndex: CatalogIndex | null;
  setCatalogIndex: React.Dispatch<React.SetStateAction<CatalogIndex | null>>;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ files, setFiles, catalogIndex, setCatalogIndex }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<{current: number, total: number} | null>(null);

  // Load catalogs and index on mount
  useEffect(() => {
    const loadData = async () => {
        try {
            const savedFiles = await loadCatalogsFromDB();
            if (savedFiles.length > 0) setFiles(savedFiles);
            
            const savedIndex = await loadCatalogIndexFromDB();
            if (savedIndex) setCatalogIndex(savedIndex);
        } catch (e) {
            console.error("Failed to load catalogs", e);
        }
    };
    loadData();
  }, [setFiles, setCatalogIndex]);

  const updateDB = async (newFiles: CatalogFile[]) => {
      try {
          await saveCatalogsToDB(newFiles);
          // If files change significantly, we might want to warn user to re-index, 
          // but for now we keep the old index until they explicitly click "Analyze"
      } catch (e) {
          console.error("Failed to save to DB", e);
      }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles: CatalogFile[] = [];
      
      for (let i = 0; i < event.target.files.length; i++) {
        const file = event.target.files[i];
        if (file.type === 'application/pdf') {
          try {
            const base64 = await fileToBase64(file);
            newFiles.push({
              id: crypto.randomUUID(),
              file,
              base64
            });
          } catch (e) {
            console.error("Error processing file", file.name, e);
          }
        } else {
          alert(`Sadece PDF dosyaları desteklenmektedir: ${file.name}`);
        }
      }
      
      const updatedList = [...files, ...newFiles];
      setFiles(updatedList);
      updateDB(updatedList);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    const updatedList = files.filter(f => f.id !== id);
    setFiles(updatedList);
    updateDB(updatedList);
  };

  const removeAll = () => {
    if(confirm("Tüm katalogları ve indeksi silmek istediğinize emin misiniz?")) {
        setFiles([]);
        setCatalogIndex(null);
        updateDB([]);
        clearCatalogIndexFromDB();
    }
  };

  const handleAnalyze = async () => {
      if(files.length === 0) return;
      setIsIndexing(true);
      setProgress({ current: 0, total: files.length });
      
      try {
          const content = await geminiService.createCatalogIndex(files, (current, total) => {
              setProgress({ current, total });
          });
          
          const newIndex: CatalogIndex = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              content: content,
              fileNames: files.map(f => f.file.name)
          };
          await saveCatalogIndexToDB(newIndex);
          setCatalogIndex(newIndex);
          alert("Kataloglar başarıyla analiz edildi ve hafızaya alındı! Artık teklif oluşturmak çok daha hızlı olacak.");
      } catch (e) {
          console.error(e);
          alert("Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      } finally {
          setIsIndexing(false);
          setProgress(null);
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col shrink-0">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-800">Katalog Yönetimi</h2>
            <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{files.length}</span>
        </div>
        <div className="flex gap-2">
            {files.length > 0 && (
                <button 
                    onClick={removeAll}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
                >
                    Temizle
                </button>
            )}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-colors"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                EKLE
            </button>
        </div>
      </div>

      <div className="p-3">
        {files.length === 0 ? (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all"
            >
                <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <p className="text-xs font-medium text-gray-700">PDF Kataloglarını Yükle</p>
            </div>
        ) : (
            <>
                <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2 custom-scrollbar mb-3">
                    {files.map(file => (
                    <div key={file.id} className="p-2 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                PDF
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="truncate text-xs font-semibold text-gray-700" title={file.file.name}>{file.file.name}</span>
                                <span className="text-[10px] text-gray-400">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => removeFile(file.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                    ))}
                </div>

                {/* Analysis Button */}
                <div className="pt-2 border-t border-gray-100">
                     {catalogIndex ? (
                         <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                             <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div>
                                    <p className="text-xs font-bold text-green-700">Kataloglar Hafızada</p>
                                    <p className="text-[10px] text-green-600">
                                        Teklif oluşturma hızlandırıldı.
                                        {(catalogIndex.content.length / 1024).toFixed(1)} KB Veri.
                                    </p>
                                </div>
                             </div>
                             <button onClick={handleAnalyze} disabled={isIndexing} className="text-[10px] text-blue-600 underline hover:text-blue-800">Güncelle</button>
                         </div>
                     ) : (
                        <button
                            onClick={handleAnalyze}
                            disabled={isIndexing}
                            className={`w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${isIndexing ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'}`}
                        >
                            {isIndexing ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    İşleniyor ({progress?.current}/{progress?.total})
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    Katalogları İşle ve Kaydet
                                </>
                            )}
                        </button>
                     )}
                     { !catalogIndex && <p className="text-[10px] text-gray-500 mt-1 text-center">İşlem yaptıktan sonra PDF yüklemenize gerek kalmaz.</p> }
                </div>
            </>
        )}
        
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
      </div>
    </div>
  );
};