import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { languages, defaultLanguage } from './languages';
import './App.css';

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pagesPerSheet, setPagesPerSheet] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [outputPages, setOutputPages] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || defaultLanguage;
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [combineToOnePage, setCombineToOnePage] = useState(false);
  const [pagesPerRow, setPagesPerRow] = useState(1);
  const [mergeMode, setMergeMode] = useState(null);
  const [mergeFiles, setMergeFiles] = useState([]);

  // Tek sayfada birleştir seçildiğinde sayfa düzenini 1'e ayarla
  const handleCombineToOnePageChange = (checked) => {
    setCombineToOnePage(checked);
    if (checked) {
      setPagesPerSheet(1);
    }
  };

  // Merge modu değiştiğinde dosyaları temizleme - kullanıcı aynı dosyalarla farklı işlem yapabilir
  const handleMergeModeChange = (checked) => {
    setMergeMode(checked);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    // Hem PDF hem resim dosyalarını kabul et
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/')
    );
    
    if (validFiles.length === 0) {
      setMessage(t.selectPdfOrImage);
      return;
    }
    
    // Dosyaları geçici olarak sakla (hem selectedFiles hem mergeFiles'e ekle)
    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
    setMergeFiles(prevFiles => [...prevFiles, ...validFiles]);
    
    // Toplam sayfa sayısını hesapla
    let totalPageCount = 0;
    for (const file of validFiles) {
      if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          totalPageCount += pdfDoc.getPageCount();
        } catch (error) {
          console.error('PDF sayfa sayısı hesaplanamadı:', error);
        }
      } else if (file.type.startsWith('image/')) {
        totalPageCount += 1; // Her resim 1 sayfa olarak sayılır
      }
    }
    
    setTotalPages(prev => prev + totalPageCount);
    setMessage(`${validFiles.length} ${t.filesAdded} ${totalPageCount} ${t.pages}`);
    
    // Input'u temizle
    event.target.value = '';
  };

  const createNUpPDF = async (pdfDoc, pagesPerSheet, fileName, isPreview = false) => {
    try {
      const pageCount = pdfDoc.getPageCount();
      const firstPage = pdfDoc.getPage(0);
      const { width: pageWidth, height: pageHeight } = firstPage.getSize();

      console.log('Sayfa boyutları:', { pageWidth, pageHeight });

      let newPageWidth, newPageHeight, cols, rows;
      
      if (combineToOnePage) {
        // Tek sayfada birleştirme için dinamik boyut hesapla
        cols = pagesPerRow;
        rows = Math.ceil(pageCount / pagesPerRow);
        newPageWidth = pageWidth * pagesPerRow;
        newPageHeight = pageHeight * rows;
      } else {
        // Normal N-up düzeni
        switch (pagesPerSheet) {
          case 1: cols = 1; rows = 1; newPageWidth = pageWidth; newPageHeight = pageHeight; break;
          case 2: cols = 2; rows = 1; newPageWidth = pageWidth * 2; newPageHeight = pageHeight; break;
          case 4: cols = 2; rows = 2; newPageWidth = pageWidth * 2; newPageHeight = pageHeight * 2; break;
          case 6: cols = 3; rows = 2; newPageWidth = pageWidth * 3; newPageHeight = pageHeight * 2; break;
          case 8: cols = 4; rows = 2; newPageWidth = pageWidth * 4; newPageHeight = pageHeight * 2; break;
          case 9: cols = 3; rows = 3; newPageWidth = pageWidth * 3; newPageHeight = pageHeight * 3; break;
          case 12: cols = 4; rows = 3; newPageWidth = pageWidth * 4; newPageHeight = pageHeight * 3; break;
          default: throw new Error('Geçersiz sayfa düzeni');
        }
      }

      console.log('Yeni sayfa boyutları:', { newPageWidth, newPageHeight, cols, rows });

      const newPdfDoc = await PDFDocument.create();

      // Tek sayfada birleştirme seçiliyse tüm sayfaları tek sayfaya sığdır
      let pagesToProcess;
      if (combineToOnePage) {
        pagesToProcess = 1; // Tüm sayfalar tek sayfada
      } else {
        // Sadece ilk sayfa için işlem yap (önizleme için)
        pagesToProcess = isPreview ? Math.min(1, Math.ceil(pageCount / pagesPerSheet)) : Math.ceil(pageCount / pagesPerSheet);
      }
      
      for (let i = 0; i < pagesToProcess; i++) {
        const newPage = newPdfDoc.addPage([newPageWidth, newPageHeight]);
        const pageIndices = [];
        
        if (combineToOnePage) {
          // Tüm sayfaları tek sayfaya sığdır
          for (let j = 0; j < pageCount; j++) {
            pageIndices.push(j);
          }
        } else {
          // Normal N-up düzeni
          for (let j = 0; j < pagesPerSheet && i * pagesPerSheet + j < pageCount; j++) {
            pageIndices.push(i * pagesPerSheet + j);
          }
        }
        
        const embeddedPages = await newPdfDoc.embedPdf(await pdfDoc.save(), pageIndices);
        
        // Sayfaları çiz
        for (let j = 0; j < embeddedPages.length; j++) {
          let col, row, x, y;
          
          if (combineToOnePage) {
            // Dinamik grid düzeni
            col = j % cols;
            row = Math.floor(j / cols);
            x = col * pageWidth;
            y = newPageHeight - (row + 1) * pageHeight;
            
            console.log(`Birleştirilmiş sayfa ${j + 1} pozisyonu:`, { col, row, x, y });
          } else {
            // Normal N-up düzeni
            col = j % cols;
            row = Math.floor(j / cols);
            x = col * pageWidth;
            y = newPageHeight - (row + 1) * pageHeight;
            
            console.log(`Sayfa ${j + 1} pozisyonu:`, { col, row, x, y });
          }
          
          // Sayfa çizimi
          newPage.drawPage(embeddedPages[j], {
            x,
            y,
            width: pageWidth,
            height: pageHeight,
          });
        }
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      if (isPreview) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          const imageUrl = canvas.toDataURL('image/png');
          setPreviewImage(imageUrl);
        } catch (error) {
          console.error('Resim oluşturma hatası:', error);
          setPreviewImage(null);
        }
        return true;
      } else {
        saveAs(blob, `nup_${pagesPerSheet}x1_${fileName}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      }
    } catch (error) {
      console.error('N-up oluşturma hatası:', error);
      return false;
    }
  };

  const handleConvert = async () => {
    // Sadece PDF dosyalarını filtrele
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      setMessage(t.selectPdfFiles);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setMessage(`${pdfFiles.length} ${t.filesProcessing}`);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const currentProgress = Math.round(((i + 1) / pdfFiles.length) * 100);
        setProgress(currentProgress);
        setMessage(`${i + 1}/${pdfFiles.length} ${t.fileProcessingProgress} ${file.name} (${currentProgress}%)`);
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          
          console.log('PDF işleme başlıyor:', {
            fileName: file.name,
            pagesPerSheet,
            pageCount: pdfDoc.getPageCount()
          });
          
          const success = await createNUpPDF(pdfDoc, pagesPerSheet, file.name, false);
          
          if (success) {
            successCount++;
            console.log(`${file.name} başarıyla işlendi ve indirildi`);
          } else {
            errorCount++;
            console.error(`${file.name} işlenemedi`);
          }
          
          // Her dosya arasında kısa bir gecikme
          if (i < pdfFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch (error) {
          console.error(`${file.name} dönüştürme hatası:`, error);
          errorCount++;
        }
      }
      
      setProgress(100);
      
      // Çıktı sayfa sayısını hesapla
      let totalInputPages = 0;
      for (const file of pdfFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          totalInputPages += pdfDoc.getPageCount();
        } catch (error) {
          console.error('PDF sayfa sayısı hesaplanamadı:', error);
        }
      }
      
      const outputPageCount = combineToOnePage ? 1 : Math.ceil(totalInputPages / pagesPerSheet);
      setOutputPages(outputPageCount);
      
      if (errorCount === 0) {
        setMessage(`${successCount} ${t.filesSuccessfullyCreated} (${totalInputPages} ${t.pagesConverted} ${outputPageCount} ${t.pagesOutput})`);
      } else {
        setMessage(`${successCount} ${t.filesSuccessful} ${errorCount} ${t.filesError} (${totalInputPages} ${t.pagesConverted} ${outputPageCount} ${t.pagesOutput})`);
      }
    } catch (error) {
      console.error('Genel dönüştürme hatası:', error);
      setMessage(t.processingError + ' ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const removeFile = async (indexToRemove) => {
    // Kaldırılacak dosyayı al
    const filesToRemove = selectedFiles[indexToRemove];
    
    // Dosyayı her iki listeden de kaldır
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setMergeFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    
    // Kaldırılan dosyanın sayfa sayısını hesapla ve toplamdan çıkar
    let removedPageCount = 0;
    if (filesToRemove.type === 'application/pdf') {
      try {
        const arrayBuffer = await filesToRemove.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        removedPageCount = pdfDoc.getPageCount();
      } catch (error) {
        console.error('PDF sayfa sayısı hesaplanamadı:', error);
      }
    } else if (filesToRemove.type.startsWith('image/')) {
      removedPageCount = 1;
    }
    
    setTotalPages(prev => Math.max(0, prev - removedPageCount));
    setMessage(`${t.fileRemoved} ${removedPageCount} ${t.pagesRemoved}`);
  };

  const removeMergeFile = async (indexToRemove) => {
    // Kaldırılacak dosyayı al
    const filesToRemove = mergeFiles[indexToRemove];
    
    // Dosyayı her iki listeden de kaldır
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setMergeFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    
    // Kaldırılan dosyanın sayfa sayısını hesapla ve toplamdan çıkar
    let removedPageCount = 0;
    if (filesToRemove.type === 'application/pdf') {
      try {
        const arrayBuffer = await filesToRemove.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        removedPageCount = pdfDoc.getPageCount();
      } catch (error) {
        console.error('PDF sayfa sayısı hesaplanamadı:', error);
      }
    } else if (filesToRemove.type.startsWith('image/')) {
      removedPageCount = 1;
    }
    
    setTotalPages(prev => Math.max(0, prev - removedPageCount));
    setMessage(`${t.fileRemoved} ${removedPageCount} ${t.pagesRemoved}`);
  };

  // Dosya sıralama fonksiyonları - her iki listeyi de güncelle
  const moveFile = (fromIndex, toIndex, isMergeMode = false) => {
    // Her iki listeyi de aynı şekilde güncelle
    setSelectedFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
    
    setMergeFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
  };

  const createMergedPDF = async () => {
    if (mergeFiles.length === 0) {
      setMessage(t.selectFilesToMerge);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setMessage(t.filesMerging);

    try {
      const newPdfDoc = await PDFDocument.create();
      
      // Maksimum genişliği sınırla (dosya boyutunu kontrol etmek için)
      const MAX_WIDTH = 800; // 800px maksimum genişlik
      let maxWidth = 0;
      const fileData = [];
      
      setMessage(t.analyzingFiles);
      
      for (let i = 0; i < mergeFiles.length; i++) {
        const file = mergeFiles[i];
        const analysisProgress = Math.round(((i + 1) / mergeFiles.length) * 50); // İlk %50 analiz için
        setProgress(analysisProgress);
        setMessage(`${i + 1}/${mergeFiles.length} ${t.fileAnalysisProgress} ${file.name} (${analysisProgress}%)`);

        if (file.type === 'application/pdf') {
          // PDF dosyası analizi
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pageCount = pdfDoc.getPageCount();
          
          for (let j = 0; j < pageCount; j++) {
            const [embeddedPage] = await newPdfDoc.embedPdf(await pdfDoc.save(), [j]);
            maxWidth = Math.max(maxWidth, Math.min(embeddedPage.width, MAX_WIDTH));
            fileData.push({
              type: 'pdf',
              embeddedPage,
              originalWidth: embeddedPage.width,
              originalHeight: embeddedPage.height
            });
          }
        } else if (file.type.startsWith('image/')) {
          try {
            // Resim dosyası analizi - boyut optimizasyonu ile
            const arrayBuffer = await file.arrayBuffer();
            let image;
            
            try {
              image = await newPdfDoc.embedPng(arrayBuffer);
            } catch (pngError) {
              try {
                image = await newPdfDoc.embedJpg(arrayBuffer);
              } catch (jpgError) {
                // Canvas yöntemi ile dene - boyut optimizasyonu ile
                const imageUrl = URL.createObjectURL(file);
                const img = new Image();
                
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = () => reject(new Error(`Resim yüklenemedi: ${file.name}`));
                  img.src = imageUrl;
                });
                
                // Resmi optimize et - maksimum boyutu sınırla
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Resim boyutunu hesapla (maksimum 800px genişlik)
                let targetWidth = img.width;
                let targetHeight = img.height;
                
                if (img.width > MAX_WIDTH) {
                  const ratio = MAX_WIDTH / img.width;
                  targetWidth = MAX_WIDTH;
                  targetHeight = img.height * ratio;
                }
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                // Resmi çiz (kaliteyi biraz düşür)
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                
                // JPEG olarak kaydet (PNG'den daha küçük)
                const jpegBlob = await new Promise((resolve, reject) => {
                  canvas.toBlob(resolve, 'image/jpeg', 0.8); // 0.8 kalite
                });
                
                const jpegArrayBuffer = await jpegBlob.arrayBuffer();
                image = await newPdfDoc.embedJpg(jpegArrayBuffer);
                
                URL.revokeObjectURL(imageUrl);
              }
            }
            
            maxWidth = Math.max(maxWidth, Math.min(image.width, MAX_WIDTH));
            fileData.push({
              type: 'image',
              image,
              originalWidth: image.width,
              originalHeight: image.height
            });
            
          } catch (imageError) {
            console.error(`Resim işleme hatası (${file.name}):`, imageError);
            throw new Error(`Resim dosyası işlenemedi: ${file.name} - ${imageError.message}`);
          }
        }
      }
      
      // Şimdi tüm sayfaları aynı genişlikte oluşturalım
      setMessage(t.creatingPages);
      
      for (let i = 0; i < fileData.length; i++) {
        const data = fileData[i];
        const creationProgress = 50 + Math.round(((i + 1) / fileData.length) * 40); // %50-90 arası oluşturma için
        setProgress(creationProgress);
        setMessage(`${i + 1}/${fileData.length} ${t.pageCreationProgress} (${creationProgress}%)`);
        
        // Yeni sayfa boyutunu hesapla (genişlik sabit, yükseklik orantılı)
        const aspectRatio = data.originalHeight / data.originalWidth;
        const newHeight = maxWidth * aspectRatio;
        
        const page = newPdfDoc.addPage([maxWidth, newHeight]);
        
        if (data.type === 'pdf') {
          // PDF sayfasını çiz
          page.drawPage(data.embeddedPage, {
            x: 0,
            y: 0,
            width: maxWidth,
            height: newHeight,
          });
        } else if (data.type === 'image') {
          // Resmi çiz
          page.drawImage(data.image, {
            x: 0,
            y: 0,
            width: maxWidth,
            height: newHeight,
          });
        }
      }

      setProgress(95);
      setMessage(`${t.savingPdfProgress} (95%)`);

      // PDF'i optimize edilmiş ayarlarla kaydet
      const pdfBytes = await newPdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 20,
        updateFieldAppearances: false
      });
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `merged_${mergeFiles.length}_files.pdf`);
      
      setProgress(100);
      setOutputPages(fileData.length);
      setMessage(`${mergeFiles.length} ${t.filesSuccessfullyMerged} (${fileData.length} ${t.pagesOutput})`);
    } catch (error) {
      console.error('PDF birleştirme hatası:', error);
      setMessage(t.mergeError + ' ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generatePreview = async () => {
    if (selectedFiles.length === 0) {
      setPreviewUrl(null);
      return;
    }

    try {
      const file = selectedFiles[0]; // İlk dosyayı kullan
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      await createNUpPDF(pdfDoc, pagesPerSheet, file.name, true);
    } catch (error) {
      console.error('Önizleme oluşturma hatası:', error);
      setPreviewUrl(null);
    }
  };

  const resetApp = () => {
    setSelectedFiles([]);
    setPagesPerSheet(2);
    setMessage('');
    setIsProcessing(false);
    setProgress(0);
    setTotalPages(0);
    setOutputPages(0);
    setPreviewUrl(null);
    setPreviewImage(null);
    setCombineToOnePage(false);
    setPagesPerRow(1);
    setMergeMode(null);
    setMergeFiles([]);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setMergeFiles([]);
    setTotalPages(0);
    setMessage(t.allFilesRemoved);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = languages[language];

  // Sayfa düzeni, dosyalar, birleştirme seçeneği veya satır sayısı değiştiğinde önizleme oluştur
  useEffect(() => {
    generatePreview();
  }, [pagesPerSheet, selectedFiles, combineToOnePage, pagesPerRow]);

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <header className="App-header">
        <h1 
          className="text-logo" 
          onClick={() => window.location.reload()}
          style={{ cursor: 'pointer' }}
        >
          {t.logo}
        </h1>
      </header>

      <button 
        onClick={toggleDarkMode} 
        className="theme-toggle"
        title={darkMode ? t.lightTheme : t.darkTheme}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className="language-toggle">
        <button 
          onClick={() => changeLanguage('tr')} 
          className={`lang-btn ${language === 'tr' ? 'active' : ''}`}
          title={t.turkish}
        >
          🇹🇷
        </button>
        <button 
          onClick={() => changeLanguage('en')} 
          className={`lang-btn ${language === 'en' ? 'active' : ''}`}
          title={t.english}
        >
          🇺🇸
        </button>
      </div>

      <main className="App-main">
        <div className="main-container">
          {/* Dosya Yükleme Adımı - İlk Adım */}
          {selectedFiles.length === 0 && mergeFiles.length === 0 && (
            <div className="upload-step">
              <h2>{t.selectFiles}</h2>
              <p>{t.selectFilesHint}</p>
              <div className="file-input-container">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                  multiple
                  onChange={handleFileSelect}
                  className="file-input"
                  id="file-input"
                />
              </div>
            </div>
          )}

          {/* İşlem Türü Seçimi - Her Zaman Görünür */}
          <div className={`mode-selection ${selectedFiles.length === 0 && mergeFiles.length === 0 ? 'disabled' : ''}`}>
            <h2>{t.selectProcessType}</h2>
            <p className="mode-hint">
              {selectedFiles.length === 0 && mergeFiles.length === 0 
                ? t.selectFilesFirst 
                : t.processTypeHint
              }
            </p>
            <div className="mode-options">
              <label className={`mode-option ${selectedFiles.length === 0 && mergeFiles.length === 0 ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mergeMode === false}
                  onChange={() => handleMergeModeChange(false)}
                  disabled={selectedFiles.length === 0 && mergeFiles.length === 0}
                />
                <span className="mode-label">{t.nupMode}</span>
              </label>
              <label className={`mode-option ${selectedFiles.length === 0 && mergeFiles.length === 0 ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mergeMode === true}
                  onChange={() => handleMergeModeChange(true)}
                  disabled={selectedFiles.length === 0 && mergeFiles.length === 0}
                />
                <span className="mode-label">{t.mergeMode}</span>
              </label>
            </div>
          </div>

          {/* PDF Seçildikten Sonraki Adımlar - N-Up Modu */}
          {!mergeMode && selectedFiles.length > 0 && mergeMode !== null && (
            <>

              
              {/* Dosya Listesi ve Ekleme Butonu */}
              <div className="files-section">
                <div className="files-header">
                  <h3>{t.selectedFiles}</h3>
                  <p className="files-hint">{t.filesHint}</p>
                  {selectedFiles.length > 0 && (
                    <button 
                      onClick={clearAllFiles} 
                      className="clear-all-button"
                      title={t.removeAllFiles}
                    >
                      {t.clearAll}
                    </button>
                  )}
                </div>
                <div className="files-list">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="file-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== index) {
                          moveFile(fromIndex, index, false);
                        }
                      }}
                    >
                      <span className="drag-handle" title={t.dragToReorder}>⋮⋮</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-type">({file.type.includes('pdf') ? t.pdf : t.image})</span>
                      <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button 
                        onClick={() => removeFile(index)} 
                        className="remove-file-button"
                        title={t.removeFile}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Dosya Ekleme Butonu */}
                <div className="add-files-section">
                  <button 
                    onClick={() => document.getElementById('file-input').click()} 
                    className="add-files-button"
                  >
                    {t.addMoreFiles}
                  </button>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Sayfa Düzeni Seçimi */}
              <div className="settings-section">
                <h2>{t.selectPageLayout}</h2>
                <select
                  value={pagesPerSheet}
                  onChange={(e) => setPagesPerSheet(Number(e.target.value))}
                  className="layout-select"
                  disabled={combineToOnePage}
                >
                  <option value={1}>{t.original}</option>
                  <option value={2}>{t.twoPages}</option>
                  <option value={4}>{t.fourPages}</option>
                  <option value={6}>{t.sixPages}</option>
                  <option value={8}>{t.eightPages}</option>
                  <option value={9}>{t.ninePages}</option>
                  <option value={12}>{t.twelvePages}</option>
                </select>
                
                {/* Tek Sayfada Birleştirme Seçeneği */}
                <div className="combine-option">
                  <div className="combine-row">
                    <label className="combine-checkbox">
                      <input
                        type="checkbox"
                        checked={combineToOnePage}
                        onChange={(e) => handleCombineToOnePageChange(e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      {t.combineToOnePage}
                    </label>
                    
                    {combineToOnePage && (
                      <div className="pages-per-row-selector">
                        <label htmlFor="pages-per-row">{t.pagesPerRow}</label>
                        <select
                          id="pages-per-row"
                          value={pagesPerRow}
                          onChange={(e) => setPagesPerRow(Number(e.target.value))}
                          className="pages-per-row-select"
                        >
                          {Array.from({length: 8}, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* PDF Önizleme */}
                <div className="layout-demo">
                  <h3>{t.pdfPreview}:</h3>
                  <div className="demo-container">
                    {combineToOnePage ? (
                      <div className="combine-demo">
                        <div 
                          className="combine-demo-grid"
                          style={{ 
                            gridTemplateColumns: `repeat(${pagesPerRow}, 60px)`,
                            gridTemplateRows: `repeat(3, 80px)`
                          }}
                        >
                          {Array.from({length: pagesPerRow * 3}, (_, i) => (
                            <div 
                              key={i} 
                              className={`combine-demo-slot ${i >= pagesPerRow * 2 ? 'fade-slot' : ''}`}
                              style={{
                                opacity: i >= pagesPerRow * 2 ? 1 - ((i - pagesPerRow * 2) * 0.2) : 1
                              }}
                            >
                              <span className="page-number">{i + 1}</span>
                            </div>
                          ))}
                        </div>
                        <p className="demo-description">
                          {pagesPerRow} {t.previewDescription}
                        </p>
                      </div>
                    ) : previewImage ? (
                      <div className="pdf-preview">
                        <img
                          src={previewImage}
                          alt="PDF Önizleme"
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            border: '1px solid #ddd', 
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        />
                      </div>
                    ) : selectedFiles.length > 0 ? (
                      <div className="preview-loading">
                        <p>{t.previewLoading}</p>
                      </div>
                    ) : (
                      <div className="no-preview">
                        <p>{t.selectPdfForPreview}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dönüştürme Butonu */}
              <div className="convert-section">
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="convert-button"
                >
                  {isProcessing ? `${t.processing} ${progress}%` : t.convertAndDownload}
                </button>
                {isProcessing && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </>
          )}

                        {/* PDF Seçildikten Sonraki Adımlar - Merge Modu */}
              {mergeMode && mergeFiles.length > 0 && mergeMode !== null && (
                <>

                  
                  {/* Dosya Listesi ve Ekleme Butonu */}
                  <div className="files-section">
                    <div className="files-header">
                      <h3>{t.selectedFiles}</h3>
                      <p className="files-hint">{t.filesHint}</p>
                      {mergeFiles.length > 0 && (
                        <button 
                          onClick={clearAllFiles} 
                          className="clear-all-button"
                          title={t.removeAllFiles}
                        >
                          {t.clearAll}
                        </button>
                      )}
                    </div>
                <div className="files-list">
                  {mergeFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="file-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== index) {
                          moveFile(fromIndex, index, true);
                        }
                      }}
                    >
                      <span className="drag-handle" title={t.dragToReorder}>⋮⋮</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-type">({file.type.includes('pdf') ? t.pdf : t.image})</span>
                      <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button 
                        onClick={() => removeMergeFile(index)} 
                        className="remove-file-button"
                        title={t.removeFile}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Dosya Ekleme Butonu */}
                <div className="add-files-section">
                  <button 
                    onClick={() => document.getElementById('file-input').click()} 
                    className="add-files-button"
                  >
                    {t.addMoreFiles}
                  </button>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Dönüştürme Butonu */}
              <div className="convert-section">
                <button
                  onClick={createMergedPDF}
                  disabled={isProcessing}
                  className="convert-button"
                >
                  {isProcessing ? `${t.merging} ${progress}%` : t.createAndDownload}
                </button>
                {isProcessing && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mesajlar */}
          {message && (
            <div className={`message ${message.includes('hata') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>
      </main>
      
      {/* Alt Logo - Kutunun Dışında */}
      <div className="sub-logo-container">
        <img 
          src="/cooltext487723576710807.png" 
          alt="Powered by İbrahim Özçelik" 
          className="sub-logo"
        />
      </div>

      <footer className="App-footer">
        <p>{t.privacyNote}</p>
      </footer>
    </div>
  );
}

export default App; 