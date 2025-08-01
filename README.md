# PDF N-Up Düzenleyici

Bu web uygulaması, PDF dosyalarını farklı sayfa düzenlerinde (n-up) yeniden düzenlemek için kullanılır.

## 🎯 Özellikler

- ✅ PDF dosyası yükleme
- ✅ Sayfa düzeni seçimi (1, 2, 4, 6, 9 sayfa/sayfa)
- ✅ Tamamen tarayıcıda PDF işleme
- ✅ Otomatik indirme
- ✅ Modern ve responsive tasarım
- ✅ Güvenli (dosyalar sunucuya gönderilmez)

## 🚀 Kurulum ve Çalıştırma

### Hızlı Başlangıç

**Windows PowerShell için (Önerilen):**
```powershell
.\start.ps1
```

**Windows Command Prompt için:**
```cmd
start.bat
```

### Manuel Kurulum

```bash
npm install
npm start
```

## 📋 Sistem Gereksinimleri

- **Node.js 14+** (sadece bu gerekli!)
- **Modern tarayıcı** (Chrome, Firefox, Safari, Edge)

## 🎨 Teknolojiler

- **Frontend**: React.js
- **PDF İşleme**: pdf-lib
- **Dosya İndirme**: file-saver

## 📖 Kullanım

1. Uygulamayı başlatın (`start.ps1` veya `start.bat` veya `npm start`)
2. Tarayıcıda http://localhost:3000 adresine gidin
3. PDF dosyasını yükleyin
4. İstediğiniz sayfa düzenini seçin (1, 2, 4, 6, 9 sayfa/sayfa)
5. "Dönüştür" butonuna tıklayın
6. İşlem tamamlandığında PDF otomatik olarak indirilir

## 🔒 Güvenlik

- Tüm işlemler tarayıcınızda gerçekleşir
- Dosyalar hiçbir sunucuya gönderilmez
- Verileriniz tamamen güvende

## 💡 Avantajlar

- **Python gerekmez** - Sadece Node.js yeterli
- **Backend gerekmez** - Tamamen tarayıcıda çalışır
- **Hızlı kurulum** - Tek komutla başlar
- **Offline çalışır** - İnternet bağlantısı gerekmez
- **Taşınabilir** - USB'de taşıyabilirsiniz

## 🎯 Desteklenen Sayfa Düzenleri

- **1 sayfa/sayfa**: Orijinal boyut
- **2 sayfa/sayfa**: Yatay düzen
- **4 sayfa/sayfa**: 2x2 grid
- **6 sayfa/sayfa**: 3x2 grid
- **9 sayfa/sayfa**: 3x3 grid

## 🛠️ Sorun Giderme

### start.bat hemen kapanıyorsa:
1. **PowerShell kullanın**: `.\start.ps1` komutunu çalıştırın
2. **Node.js kontrol edin**: `node --version` komutu çalışmalı
3. **Yönetici olarak çalıştırın**: CMD veya PowerShell'i yönetici olarak açın

### Diğer sorunlar:
1. Node.js'in güncel olduğundan emin olun
2. Tarayıcınızın güncel olduğundan emin olun
3. PDF dosyasının bozuk olmadığından emin olun 