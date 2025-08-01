Write-Host "PDF N-Up Düzenleyici Başlatılıyor..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

Write-Host "Bu uygulama tamamen tarayıcıda çalışır!" -ForegroundColor Cyan
Write-Host "Python veya backend gerekmez." -ForegroundColor Cyan
Write-Host ""

Write-Host "Node.js kontrol ediliyor..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js kurulu: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js bulunamadı"
    }
} catch {
    Write-Host "❌ Node.js bulunamadı!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Node.js kurulumu için:" -ForegroundColor Yellow
    Write-Host "1. https://nodejs.org/ adresine gidin" -ForegroundColor White
    Write-Host "2. 'LTS' versiyonunu indirin" -ForegroundColor White
    Write-Host "3. Kurulum sırasında 'Add to PATH' seçeneğini işaretleyin" -ForegroundColor White
    Write-Host "4. Kurulum tamamlandıktan sonra bu scripti tekrar çalıştırın" -ForegroundColor White
    Write-Host ""
    Read-Host "Devam etmek için Enter'a basın"
    exit 1
}

Write-Host ""
Write-Host "npm kontrol ediliyor..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ npm çalışıyor: $npmVersion" -ForegroundColor Green
    } else {
        throw "npm bulunamadı"
    }
} catch {
    Write-Host "❌ npm bulunamadı!" -ForegroundColor Red
    Write-Host "Node.js kurulumunu kontrol edin." -ForegroundColor Yellow
    Read-Host "Devam etmek için Enter'a basın"
    exit 1
}

Write-Host ""
Write-Host "Bağımlılıklar kontrol ediliyor..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Node modules bulunamadı, kuruluyor..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Bağımlılık kurulumu başarısız!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Sorun giderme:" -ForegroundColor Yellow
        Write-Host "1. İnternet bağlantınızı kontrol edin" -ForegroundColor White
        Write-Host "2. Antivirüs programınızı geçici olarak devre dışı bırakın" -ForegroundColor White
        Write-Host "3. Yönetici olarak çalıştırmayı deneyin" -ForegroundColor White
        Write-Host ""
        Read-Host "Devam etmek için Enter'a basın"
        exit 1
    }
} else {
    Write-Host "✅ Bağımlılıklar zaten kurulu." -ForegroundColor Green
}

Write-Host ""
Write-Host "Uygulama başlatılıyor..." -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Tarayıcıda açılacak: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Özellikler:" -ForegroundColor Cyan
Write-Host "   - Tamamen tarayıcıda çalışır" -ForegroundColor White
Write-Host "   - Dosyalar sunucuya gönderilmez" -ForegroundColor White
Write-Host "   - Hızlı ve güvenli" -ForegroundColor White
Write-Host "   - Python/Backend gerekmez" -ForegroundColor White
Write-Host ""

npm start

Write-Host ""
Write-Host "Uygulama kapatıldı." -ForegroundColor Yellow
Read-Host "Devam etmek için Enter'a basın" 