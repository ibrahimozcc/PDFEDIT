import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { languages, defaultLanguage } from './languages';
import './App.css';
import NotificationManager from './components/NotificationManager';

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pagesPerSheet, setPagesPerSheet] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);

  const [progress, setProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || defaultLanguage;
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [pagesPerRow, setPagesPerRow] = useState(1);
  const [mergeMode, setMergeMode] = useState(null);
  const [mergeFiles, setMergeFiles] = useState([]);
  const [combineMode, setCombineMode] = useState(false);
  const [showPageLayoutDropdown, setShowPageLayoutDropdown] = useState(false);
  const [showCombineLayoutDropdown, setShowCombineLayoutDropdown] = useState(false);



  // Merge modu değiştiğinde dosyaları temizleme - kullanıcı aynı dosyalarla farklı işlem yapabilir
  const handleMergeModeChange = (checked) => {
    setMergeMode(checked);
    setCombineMode(false);
  };

  // Combine modu değiştiğinde
  const handleCombineModeChange = (checked) => {
    setCombineMode(checked);
    setMergeMode(null);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    // Hem PDF hem resim dosyalarını kabul et
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/')
    );
    
    if (validFiles.length === 0) {
              if (window.showNotification) {
          window.showNotification({
            title: t.error,
            message: t.selectPdfOrImage,
            icon: 'error'
          });
        }
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
    
    // Bildirim göster
    if (window.showNotification) {
      window.showNotification({
        title: t.fileAdded,
        message: `${validFiles.length} ${t.filesAdded} ${totalPageCount} ${t.pages}`,
        icon: 'add'
      });
    }
    
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
      
      if (combineMode) {
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
          default: throw new Error(t.invalidPageLayout);
        }
      }

      console.log('Yeni sayfa boyutları:', { newPageWidth, newPageHeight, cols, rows });

      const newPdfDoc = await PDFDocument.create();

      // Tek sayfada birleştirme seçiliyse tüm sayfaları tek sayfaya sığdır
      let pagesToProcess;
      if (combineMode) {
        pagesToProcess = 1; // Tüm sayfalar tek sayfada
      } else {
        // Sadece ilk sayfa için işlem yap (önizleme için)
        pagesToProcess = isPreview ? Math.min(1, Math.ceil(pageCount / pagesPerSheet)) : Math.ceil(pageCount / pagesPerSheet);
      }
      
      for (let i = 0; i < pagesToProcess; i++) {
        const newPage = newPdfDoc.addPage([newPageWidth, newPageHeight]);
        const pageIndices = [];
        
        if (combineMode) {
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
          
          if (combineMode) {
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
              if (window.showNotification) {
          window.showNotification({
            title: 'Hata',
            message: t.selectPdfFiles,
            icon: 'error'
          });
        }
      return;
    }

    setIsProcessing(true);
    setProgress(0);


    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const currentProgress = Math.round(((i + 1) / pdfFiles.length) * 100);
        setProgress(currentProgress);

        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          
          console.log('PDF işleme başlıyor:', {
            fileName: file.name,
            pagesPerSheet: combineMode ? 1 : pagesPerSheet,
            pageCount: pdfDoc.getPageCount()
          });
          
          // Combine modunda tek sayfa olarak işle
          const success = await createNUpPDF(pdfDoc, combineMode ? 1 : pagesPerSheet, file.name, false);
          
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
      
      const outputPageCount = combineMode ? 1 : Math.ceil(totalInputPages / pagesPerSheet);
      
      if (errorCount === 0) {
        if (window.showNotification) {
          window.showNotification({
            title: 'Başarılı',
            message: `${successCount} ${t.filesSuccessfullyCreated} (${totalInputPages} ${t.pagesConverted} ${outputPageCount} ${t.pagesOutput})`,
            icon: 'success'
          });
        }
      } else {
        if (window.showNotification) {
          window.showNotification({
            title: 'Kısmi Başarı',
            message: `${successCount} ${t.filesSuccessful} ${errorCount} ${t.filesError} (${totalInputPages} ${t.pagesConverted} ${outputPageCount} ${t.pagesOutput})`,
            icon: 'info'
          });
        }
      }
    } catch (error) {
      console.error('Genel dönüştürme hatası:', error);
              if (window.showNotification) {
          window.showNotification({
            title: 'Hata',
            message: t.processingError + ' ' + error.message,
            icon: 'error'
          });
        }
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
    
    // Bildirim göster
    if (window.showNotification) {
      window.showNotification({
        title: t.fileRemoved,
        message: `${filesToRemove.name} ${t.fileRemovedMessage}`,
        icon: 'file'
      });
    }
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
    
    // Bildirim göster
    if (window.showNotification) {
      window.showNotification({
        title: t.fileRemoved,
        message: `${filesToRemove.name} ${t.fileRemovedMessage}`,
        icon: 'file'
      });
    }
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
              if (window.showNotification) {
          window.showNotification({
            title: t.error,
            message: t.selectFilesToMerge,
            icon: 'error'
          });
        }
      return;
    }

    setIsProcessing(true);
    setProgress(0);


    try {
      const newPdfDoc = await PDFDocument.create();
      
      // Maksimum genişliği sınırla (dosya boyutunu kontrol etmek için)
      const MAX_WIDTH = 800; // 800px maksimum genişlik
      let maxWidth = 0;
      const fileData = [];
      

      
      for (let i = 0; i < mergeFiles.length; i++) {
        const file = mergeFiles[i];
        const analysisProgress = Math.round(((i + 1) / mergeFiles.length) * 50); // İlk %50 analiz için
        setProgress(analysisProgress);


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

      
      for (let i = 0; i < fileData.length; i++) {
        const data = fileData[i];
        const creationProgress = 50 + Math.round(((i + 1) / fileData.length) * 40); // %50-90 arası oluşturma için
        setProgress(creationProgress);

        
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
      if (window.showNotification) {
        window.showNotification({
          title: 'Başarılı',
          message: `${mergeFiles.length} ${t.filesSuccessfullyMerged} (${fileData.length} ${t.pagesOutput})`,
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('PDF birleştirme hatası:', error);
              if (window.showNotification) {
          window.showNotification({
            title: 'Hata',
            message: t.mergeError + ' ' + error.message,
            icon: 'error'
          });
        }
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generatePreview = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    try {
      const file = selectedFiles[0]; // İlk dosyayı kullan
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      await createNUpPDF(pdfDoc, pagesPerSheet, file.name, true);
    } catch (error) {
      console.error('Önizleme oluşturma hatası:', error);
    }
  };



  const clearAllFiles = () => {
    setSelectedFiles([]);
    setMergeFiles([]);
    setTotalPages(0);
    
    // Bildirim göster
    if (window.showNotification) {
      window.showNotification({
        title: 'Tüm Dosyalar Temizlendi',
        message: 'Tüm dosyalar başarıyla kaldırıldı',
        icon: 'info'
      });
    }
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

  // Sayfa düzeni, dosyalar veya satır sayısı değiştiğinde önizleme oluştur
  useEffect(() => {
    generatePreview();
  }, [pagesPerSheet, selectedFiles, pagesPerRow, generatePreview]);

  // Logo animasyonu
  useEffect(() => {
    const logoContainer = document.getElementById('logoContainer');
    const logoTextElement = document.getElementById('logoText');
    const scannerLight = document.getElementById('scannerLight');
    
    if (!logoContainer || !logoTextElement || !scannerLight) return;
    
    const text = logoTextElement.innerText;
    logoTextElement.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.innerHTML = char === ' ' ? '&nbsp;' : char;
      logoTextElement.appendChild(span);
    });

    const letterSpans = logoTextElement.querySelectorAll('span');
    let containerRect;
    let letterPositions = [];

    function calculatePositions() {
      containerRect = logoContainer.getBoundingClientRect();
      letterPositions = Array.from(letterSpans).map(span => {
        const rect = span.getBoundingClientRect();
        return {
          element: span,
          start: rect.left - containerRect.left
        };
      });
    }

    window.addEventListener('resize', calculatePositions);
    calculatePositions();

    // Aydınlatma animasyon mantığı
    function animateScanner() {
      const growTime = 400;
      const scanTime = 2500;
      const pauseAtEndTime = 300;
      const shrinkTime = 400;
      const pauseLoopTime = 1000;

      scannerLight.style.transition = `transform ${growTime}ms ease-out, left 0s`;
      scannerLight.style.transform = 'scaleY(1)';

      let checkInterval;

      setTimeout(() => {
        scannerLight.style.transition = `left ${scanTime}ms linear, transform 0s`;
        scannerLight.style.left = `${containerRect.width - scannerLight.offsetWidth - 5}px`;

        checkInterval = setInterval(() => {
          const scannerRect = scannerLight.getBoundingClientRect();
          const scannerPos = scannerRect.left - containerRect.left;

          // Tarayıcının pozisyonuna göre harflerin opaklığını ayarla
          letterPositions.forEach(letter => {
            if (letter.start < scannerPos) {
              letter.element.style.opacity = 1; // Tarayıcının solundaysa tam opak yap
            } else {
              letter.element.style.opacity = 0.2; // Sağındaysa %20 opak yap
            }
          });
        }, 10);
      }, growTime);

      setTimeout(() => {
        clearInterval(checkInterval);
        // Animasyon sonunda tüm harflerin tam opak olmasını sağla
        letterSpans.forEach(span => span.style.opacity = 1);
        
        scannerLight.style.transition = `transform ${shrinkTime}ms ease-in, left 0s`;
        scannerLight.style.transform = 'scaleY(0)';
      }, growTime + scanTime + pauseAtEndTime);

      setTimeout(() => {
        scannerLight.style.transition = 'none';
        scannerLight.style.left = '0px';
        scannerLight.style.transform = 'scaleY(0)';
        
        // Yeni döngü için tüm harfleri başlangıç durumuna getir
        letterSpans.forEach(span => span.style.opacity = 0.2);
        
        setTimeout(animateScanner, 50);
      }, growTime + scanTime + pauseAtEndTime + shrinkTime + pauseLoopTime);
    }

    setTimeout(animateScanner, 500);

    // Cleanup
    return () => {
      window.removeEventListener('resize', calculatePositions);
    };
  }, []);

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <header className="App-header">
        <div className="logo-container" id="logoContainer" onClick={() => window.location.reload()}>
                          <h1 className="logo-text" id="logoText">PDF DÜZENLE</h1>
          <div className="scanner-light" id="scannerLight"></div>
        </div>
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
            <div className="bg-white p-6 rounded-2xl shadow-lg w-full mx-auto">
              {/* Üst Kısım: İkon ve Metin */}
              <div className="flex items-center space-x-4 mb-6">
                {/* İkon Kutusu */}
                <div className="bg-gray-100 p-3 rounded-lg">
                  {/* Kutu ikonu (SVG) */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                {/* Metin Alanı */}
                <div>
                  <p className="text-gray-500 font-medium">{t.pdfAndImage}</p>
                  <p className="text-gray-900 font-bold text-lg">{t.selectFiles}</p>
                </div>
              </div>
              
              {/* Kesikli Çizgi Alanı */}
              <div className="border-2 border-dashed border-purple-400 rounded-xl p-8 flex items-center justify-center">
                {/* Öğe Butonu */}
                <button 
                  onClick={() => document.getElementById('file-input').click()}
                  className="bg-gray-900 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-gray-800 transition-colors"
                >
                  {t.selectFiles}
                </button>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
              </div>
            </div>
          )}

          {/* İşlem Türü Seçimi - Her Zaman Görünür */}
          <div className={`bg-white p-6 rounded-2xl shadow-lg w-full mx-auto ${selectedFiles.length === 0 && mergeFiles.length === 0 ? 'opacity-50' : ''}`}>
            {/* Üst Kısım: İkon ve Metin */}
            <div className="flex items-center space-x-4 mb-6">
              {/* İkon Kutusu */}
              <div className="bg-gray-100 p-3 rounded-lg">
                {/* Ayarlar ikonu (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              {/* Metin Alanı */}
              <div>
                <p className="text-gray-500 font-medium">İşlem Türü</p>
                <p className="text-gray-900 font-bold text-lg">{t.selectProcessType}</p>
              </div>
            </div>
            
            {/* İçerik Alanı */}
            <div className="space-y-4">
              {/* Segmented Button Tasarımı */}
              <div className={`relative flex rounded-lg border border-gray-300 bg-gray-100 p-1 ${selectedFiles.length === 0 && mergeFiles.length === 0 ? 'opacity-50' : ''}`}>
                {/* Birleştir Seçeneği */}
                <button
                  onClick={() => !(selectedFiles.length === 0 && mergeFiles.length === 0) && handleMergeModeChange(true)}
                  disabled={selectedFiles.length === 0 && mergeFiles.length === 0}
                  className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedFiles.length === 0 && mergeFiles.length === 0 
                      ? 'cursor-not-allowed text-gray-400' 
                      : mergeMode === true 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.mergeButton}
                </button>
                
                {/* Ayırıcı Çizgi - Sadece hiçbir seçenek seçilmediğinde */}
                {mergeMode === null && !combineMode && (
                  <div className="w-px bg-gray-300 mx-1"></div>
                )}
                
                {/* N-up Seçeneği */}
                <button
                  onClick={() => !(selectedFiles.length === 0 && mergeFiles.length === 0) && handleMergeModeChange(false)}
                  disabled={selectedFiles.length === 0 && mergeFiles.length === 0}
                  className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedFiles.length === 0 && mergeFiles.length === 0 
                      ? 'cursor-not-allowed text-gray-400' 
                      : mergeMode === false 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.nupButton}
                </button>

                {/* Ayırıcı Çizgi - N-up ve Tek Sayfa arasında */}
                {mergeMode === null && !combineMode && (
                  <div className="w-px bg-gray-300 mx-1"></div>
                )}
                
                {/* Tek Sayfa Seçeneği */}
                <button
                  onClick={() => !(selectedFiles.length === 0 && mergeFiles.length === 0) && handleCombineModeChange(true)}
                  disabled={selectedFiles.length === 0 && mergeFiles.length === 0}
                  className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedFiles.length === 0 && mergeFiles.length === 0 
                      ? 'cursor-not-allowed text-gray-400' 
                      : combineMode === true 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.combineButton}
                </button>
              </div>
            </div>
          </div>

          {/* PDF Seçildikten Sonraki Adımlar - N-Up Modu */}
          {!mergeMode && selectedFiles.length > 0 && mergeMode !== null && (
            <>

              
              {/* Dosya Listesi ve Ekleme Butonu */}
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full mx-auto">
                {/* Üst Kısım: İkon ve Metin */}
                <div className="flex items-center space-x-4 mb-6">
                  {/* İkon Kutusu */}
                  <div className="bg-gray-100 p-3 rounded-lg">
                    {/* Dosya ikonu (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                  </div>
                  {/* Metin Alanı */}
                  <div className="text-left">
                    <p className="text-gray-500 font-medium">Seçilen Dosyalar</p>
                    <p className="text-gray-900 font-bold text-lg">{t.selectedFiles}</p>
                    <p className="text-gray-500 text-sm mt-1">{t.multipleFilesNote}</p>
                  </div>
                </div>
                
                {/* İçerik Alanı */}
                <div className="space-y-4">
                  {selectedFiles.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {selectedFiles.map((file, index) => (
                        <div key={index}>
                          <div 
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add('bg-gray-100');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bg-gray-100');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('bg-gray-100');
                              const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                              if (fromIndex !== index) {
                                moveFile(fromIndex, index, false);
                              }
                            }}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <span className="text-gray-400 cursor-move" title={t.dragToReorder}>⋮⋮</span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.type.includes('pdf') ? t.pdf : t.image} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => removeFile(index)} 
                              className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                              title={t.removeFile}
                            >
                              ✕
                            </button>
                          </div>
                          {index < selectedFiles.length - 1 && (
                            <div className="border-b border-gray-100"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex space-x-3 pt-4">
                    <button 
                      onClick={() => document.getElementById('file-input').click()} 
                      className="flex-1 bg-white text-gray-600 border-2 border-gray-200 rounded-full px-6 py-3 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                      </svg>
                      <span>{t.addFile}</span>
                    </button>
                    
                  {selectedFiles.length > 0 && (
                    <button 
                      onClick={clearAllFiles} 
                          className="flex-1 bg-white text-red-500 border-2 border-red-300 rounded-full px-6 py-3 hover:bg-red-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                      title={t.removeAllFiles}
                    >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                          <span>{t.clearAll}</span>
                    </button>
                  )}
                </div>
                  
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Sayfa Düzeni Seçimi */}
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full mx-auto">
                {/* Üst Kısım: İkon ve Metin */}
                <div className="flex items-center space-x-4 mb-6">
                  {/* İkon Kutusu */}
                  <div className="bg-gray-100 p-3 rounded-lg">
                    {/* Sayfa düzeni ikonu (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="9"></line>
                      <line x1="9" y1="13" x2="15" y2="13"></line>
                      <line x1="9" y1="17" x2="15" y2="17"></line>
                    </svg>
                  </div>
                  {/* Metin Alanı */}
                  <div>
                    <p className="text-gray-500 font-medium">{t.pageLayout}</p>
                    <p className="text-gray-900 font-bold text-lg">{t.selectPageLayout}</p>
                  </div>
                </div>
                
                {/* İçerik Alanı */}
                <div className="space-y-4">
                  {/* Sayfa Düzeni Seçimi - ListTile Tasarımı */}
                  <div className="relative">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div 
                        className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setShowPageLayoutDropdown(!showPageLayoutDropdown)}
                      >
                        {/* Sol taraf - Başlık */}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{t.pageLayout}</p>
                        </div>
                        
                        {/* Sağ taraf - Detay ve Ok İkonu */}
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 text-sm">
                            {pagesPerSheet === 1 && t.original}
                            {pagesPerSheet === 2 && t.twoPages}
                            {pagesPerSheet === 4 && t.fourPages}
                            {pagesPerSheet === 6 && t.sixPages}
                            {pagesPerSheet === 8 && t.eightPages}
                            {pagesPerSheet === 9 && t.ninePages}
                            {pagesPerSheet === 12 && t.twelvePages}
                          </span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className={`text-gray-400 transition-transform duration-200 ${
                              showPageLayoutDropdown ? 'rotate-180' : ''
                            }`}
                          >
                            <polyline points="6,9 12,15 18,9"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Sayfa Düzeni Seçenekleri - Dropdown */}
                    {showPageLayoutDropdown && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                        {[
                          { value: 1, label: t.original },
                          { value: 2, label: t.twoPages },
                          { value: 4, label: t.fourPages },
                          { value: 6, label: t.sixPages },
                          { value: 8, label: t.eightPages },
                          { value: 9, label: t.ninePages },
                          { value: 12, label: t.twelvePages }
                        ].map((option, index) => (
                          <div key={option.value}>
                            <div 
                              className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                pagesPerSheet === option.value ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                              }`}
                              onClick={() => {
                                setPagesPerSheet(option.value);
                                setShowPageLayoutDropdown(false);
                              }}
                            >
                              {/* Sol taraf - Başlık */}
                              <div className="flex-1">
                                <p className={`font-medium ${
                                  pagesPerSheet === option.value ? 'text-purple-900' : 'text-gray-900'
                                }`}>
                                  {option.label}
                                </p>
                              </div>
                              
                              {/* Sağ taraf - Seçim İkonu */}
                              <div className="flex items-center space-x-2">
                                {pagesPerSheet === option.value && (
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="text-purple-600"
                                  >
                                    <polyline points="20,6 9,17 4,12"></polyline>
                                  </svg>
                                )}
                              </div>
                            </div>
                            {index < 6 && (
                              <div className="border-b border-gray-100"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* PDF Önizleme */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">{t.pdfPreview}:</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {previewImage ? (
                        <div className="text-center">
                          <img
                            src={previewImage}
                            alt="PDF Önizleme"
                            className="max-w-full h-auto border border-gray-300 rounded-lg shadow-sm"
                          />
                        </div>
                      ) : selectedFiles.length > 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500">{t.previewLoading}</p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500">{t.selectPdfForPreview}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dönüştürme Butonu */}
              <div className="w-full">
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-full shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  {isProcessing ? `${t.processing} ${progress}%` : t.convertAndDownload}
                </button>
                
                {isProcessing && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* PDF Seçildikten Sonraki Adımlar - Combine Modu */}
          {combineMode && selectedFiles.length > 0 && (
            <>
              {/* Dosya Listesi ve Ekleme Butonu */}
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full mx-auto">
                {/* Üst Kısım: İkon ve Metin */}
                <div className="flex items-center space-x-4 mb-6">
                  {/* İkon Kutusu */}
                  <div className="bg-gray-100 p-3 rounded-lg">
                    {/* Dosya ikonu (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                  </div>
                  {/* Metin Alanı */}
                  <div className="text-left">
                    <p className="text-gray-500 font-medium">Seçilen Dosyalar</p>
                    <p className="text-gray-900 font-bold text-lg">{t.selectedFiles}</p>
                    <p className="text-gray-500 text-sm mt-1">{t.multipleFilesNote}</p>
                  </div>
                </div>
                
                {/* İçerik Alanı */}
                <div className="space-y-4">
                  {selectedFiles.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {selectedFiles.map((file, index) => (
                        <div key={index}>
                    <div 
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                              e.currentTarget.classList.add('bg-gray-100');
                      }}
                      onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bg-gray-100');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                              e.currentTarget.classList.remove('bg-gray-100');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== index) {
                          moveFile(fromIndex, index, false);
                        }
                      }}
                    >
                            <div className="flex items-center space-x-3 flex-1">
                              <span className="text-gray-400 cursor-move" title={t.dragToReorder}>⋮⋮</span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.type.includes('pdf') ? t.pdf : t.image} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                      <button 
                        onClick={() => removeFile(index)} 
                              className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                        title={t.removeFile}
                      >
                        ✕
                      </button>
                          </div>
                          {index < selectedFiles.length - 1 && (
                            <div className="border-b border-gray-100"></div>
                          )}
                    </div>
                  ))}
                </div>
                  )}
                
                  <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => document.getElementById('file-input').click()} 
                      className="flex-1 bg-white text-gray-600 border-2 border-gray-200 rounded-full px-6 py-3 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                      </svg>
                      <span>{t.addFile}</span>
                  </button>
                    
                                       {selectedFiles.length > 0 && (
                     <button 
                       onClick={clearAllFiles} 
                         className="flex-1 bg-white text-red-500 border-2 border-red-300 rounded-full px-6 py-3 hover:bg-red-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                       title={t.removeAllFiles}
                     >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <polyline points="3,6 5,6 21,6"></polyline>
                          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        <span>{t.clearAll}</span>
                      </button>
                    )}
                  </div>
                  
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Sayfa Düzeni Seçimi */}
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full mx-auto">
                {/* Üst Kısım: İkon ve Metin */}
                <div className="flex items-center space-x-4 mb-6">
                  {/* İkon Kutusu */}
                  <div className="bg-gray-100 p-3 rounded-lg">
                    {/* Sayfa düzeni ikonu (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="9"></line>
                      <line x1="9" y1="13" x2="15" y2="13"></line>
                      <line x1="9" y1="17" x2="15" y2="17"></line>
                    </svg>
                  </div>
                  {/* Metin Alanı */}
                  <div className="text-left">
                    <p className="text-gray-500 font-medium">{t.pageLayout}</p>
                    <p className="text-gray-900 font-bold text-lg">{t.singlePageSettings}</p>
                  </div>
                </div>
                
                {/* İçerik Alanı */}
                <div className="space-y-4">
                  {/* Satır Başına Sayfa Sayısı Seçimi - ListTile Tasarımı */}
                  <div className="relative">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div 
                        className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setShowCombineLayoutDropdown(!showCombineLayoutDropdown)}
                      >
                        {/* Sol taraf - Başlık */}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{t.pagesPerRow}</p>
                        </div>
                        
                        {/* Sağ taraf - Detay ve Ok İkonu */}
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 text-sm">
                            {pagesPerRow} {t.pagesPerRowText}
                          </span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className={`text-gray-400 transition-transform duration-200 ${
                              showCombineLayoutDropdown ? 'rotate-180' : ''
                            }`}
                          >
                            <polyline points="6,9 12,15 18,9"></polyline>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Satır Başına Sayfa Sayısı Seçenekleri - Dropdown */}
                    {showCombineLayoutDropdown && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                        {Array.from({length: 8}, (_, i) => i + 1).map((num, index) => (
                          <div key={num}>
                            <div 
                              className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                                pagesPerRow === num ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                              }`}
                              onClick={() => {
                                setPagesPerRow(num);
                                setShowCombineLayoutDropdown(false);
                              }}
                            >
                              {/* Sol taraf - Başlık */}
                              <div className="flex-1">
                                <p className={`font-medium ${
                                  pagesPerRow === num ? 'text-purple-900' : 'text-gray-900'
                                }`}>
                                  {num} {t.pagesPerRowText}
                                </p>
                      </div>
                              
                              {/* Sağ taraf - Seçim İkonu */}
                              <div className="flex items-center space-x-2">
                                {pagesPerRow === num && (
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="20" 
                                    height="20" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="text-purple-600"
                                  >
                                    <polyline points="20,6 9,17 4,12"></polyline>
                                  </svg>
                    )}
                  </div>
                            </div>
                            {index < 7 && (
                              <div className="border-b border-gray-100"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                
                {/* PDF Önizleme */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">{t.preview}:</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-center">
                        <div 
                          className="inline-grid gap-1 mb-3"
                          style={{ 
                            gridTemplateColumns: `repeat(${pagesPerRow}, 40px)`,
                            gridTemplateRows: `repeat(3, 50px)`
                          }}
                        >
                          {Array.from({length: pagesPerRow * 3}, (_, i) => (
                            <div 
                              key={i} 
                              className="bg-white border border-gray-300 rounded flex items-center justify-center text-xs"
                              style={{
                                opacity: i >= pagesPerRow * 2 ? 1 - ((i - pagesPerRow * 2) * 0.2) : 1
                              }}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">
                          {pagesPerRow} {t.pagesPerRowText}
                        </p>
                      </div>
                      </div>
                      </div>
                </div>
              </div>

              {/* Dönüştürme Butonu */}
              <div className="w-full">
                <button
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-full shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  {isProcessing ? `${t.processing} ${progress}%` : t.createSinglePageAndDownload}
                </button>
                
                {isProcessing && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full mx-auto">
                {/* Üst Kısım: İkon ve Metin */}
                <div className="flex items-center space-x-4 mb-6">
                  {/* İkon Kutusu */}
                  <div className="bg-gray-100 p-3 rounded-lg">
                    {/* Dosya ikonu (SVG) */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                </div>
                  {/* Metin Alanı */}
                  <div>
                    <p className="text-gray-500 font-medium">Seçilen Dosyalar</p>
                    <p className="text-gray-900 font-bold text-lg">{t.selectedFiles}</p>
                  </div>
                </div>
                
                {/* İçerik Alanı */}
                <div className="space-y-4">
                  {mergeFiles.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {mergeFiles.map((file, index) => (
                        <div key={index}>
                    <div 
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                              e.currentTarget.classList.add('bg-gray-100');
                      }}
                      onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bg-gray-100');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                              e.currentTarget.classList.remove('bg-gray-100');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== index) {
                          moveFile(fromIndex, index, true);
                        }
                      }}
                    >
                            <div className="flex items-center space-x-3 flex-1">
                              <span className="text-gray-400 cursor-move" title={t.dragToReorder}>⋮⋮</span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.type.includes('pdf') ? t.pdf : t.image} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                      <button 
                        onClick={() => removeMergeFile(index)} 
                              className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                        title={t.removeFile}
                      >
                        ✕
                      </button>
                          </div>
                          {index < mergeFiles.length - 1 && (
                            <div className="border-b border-gray-100"></div>
                          )}
                    </div>
                  ))}
                </div>
                  )}
                
                  <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => document.getElementById('file-input').click()} 
                       className="flex-1 bg-white text-gray-600 border-2 border-gray-200 rounded-full px-6 py-3 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                     >
                       <svg 
                         xmlns="http://www.w3.org/2000/svg" 
                         width="20" 
                         height="20" 
                         viewBox="0 0 24 24" 
                         fill="none" 
                         stroke="currentColor" 
                         strokeWidth="2" 
                         strokeLinecap="round" 
                         strokeLinejoin="round"
                       >
                         <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                         <polyline points="14,2 14,8 20,8"></polyline>
                         <line x1="12" y1="18" x2="12" y2="12"></line>
                         <line x1="9" y1="15" x2="15" y2="15"></line>
                       </svg>
                       <span>{t.addFile}</span>
                  </button>
                    
                      {mergeFiles.length > 0 && (
                        <button 
                          onClick={clearAllFiles} 
                          className="flex-1 bg-white text-red-500 border-2 border-red-300 rounded-full px-6 py-3 hover:bg-red-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                          title={t.removeAllFiles}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                          <span>{t.clearAll}</span>
                        </button>
                      )}
                    </div>
                  
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Dönüştürme Butonu */}
              <div className="w-full">
                <button
                  onClick={createMergedPDF}
                  disabled={isProcessing || mergeFiles.length < 2}
                  className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-full shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  {isProcessing ? `${t.merging} ${progress}%` : t.createAndDownload}
                </button>
                
                {isProcessing && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </>
          )}


        </div>
      </main>
      
      {/* Sosyal Medya Bağlantıları */}
      <div className="max-w-md mx-auto mt-8 mb-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.developer}</h3>
            <p className="text-sm text-gray-600">{t.developerName}</p>
          </div>
          
          <div className="flex justify-center space-x-4">
          <a 
            href="https://www.instagram.com/ibrahimozcc/" 
            target="_blank" 
            rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            title="Instagram"
          >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
                <path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
            
          <a 
            href="https://www.linkedin.com/in/eczibrahimozcelik/" 
            target="_blank" 
            rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            title="LinkedIn"
          >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
                <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          </div>
        </div>
      </div>



      <footer className="App-footer">
        <p>{t.privacyNote}</p>
      </footer>
      
      {/* Bildirim Yöneticisi */}
      <NotificationManager />
    </div>
  );
}

export default App; 