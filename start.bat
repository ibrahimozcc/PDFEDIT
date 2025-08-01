@echo off
echo PDF N-Up Düzenleyici Başlatılıyor...
echo ====================================
echo.

echo Bu uygulama tamamen tarayıcıda çalışır!
echo Python veya backend gerekmez.
echo.

echo Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js bulunamadı!
    echo.
    echo Node.js kurulumu için:
    echo 1. https://nodejs.org/ adresine gidin
    echo 2. "LTS" versiyonunu indirin
    echo 3. Kurulum sırasında "Add to PATH" seçeneğini işaretleyin
    echo 4. Kurulum tamamlandıktan sonra bu scripti tekrar çalıştırın
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js kurulu: 
    node --version
)

echo.
echo npm kontrol ediliyor...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm bulunamadı!
    echo Node.js kurulumunu kontrol edin.
    pause
    exit /b 1
) else (
    echo ✅ npm çalışıyor:
    npm --version
)

echo.
echo Bağımlılıklar kontrol ediliyor...
if not exist "node_modules" (
    echo Node modules bulunamadı, kuruluyor...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Bağımlılık kurulumu başarısız!
        echo.
        echo Sorun giderme:
        echo 1. İnternet bağlantınızı kontrol edin
        echo 2. Antivirüs programınızı geçici olarak devre dışı bırakın
        echo 3. Yönetici olarak çalıştırmayı deneyin
        echo.
        pause
        exit /b 1
    )
) else (
    echo ✅ Bağımlılıklar zaten kurulu.
)

echo.
echo Uygulama başlatılıyor...
echo.
echo 🌐 Tarayıcıda açılacak: http://localhost:3000
echo.
echo 💡 Özellikler:
echo    - Tamamen tarayıcıda çalışır
echo    - Dosyalar sunucuya gönderilmez
echo    - Hızlı ve güvenli
echo    - Python/Backend gerekmez
echo.

npm start

echo.
echo Uygulama kapatıldı.
pause 