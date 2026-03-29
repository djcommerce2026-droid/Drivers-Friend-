@echo off
echo ==========================================
echo    BUILD: DRIVERS FRIEND (EXECUTANDO)
echo ==========================================

echo [1/7] Limpando dados no Moto G54...
call adb shell pm clear com.driversfriend.app

echo [2/7] Gerando Assets Web...
call npm run build

echo [3/7] Sincronizando Capacitor...
call npx cap sync android

echo [4/7] Acessando pasta nativa...
cd /d "%~dp0android"

echo [5/7] Executando Gradle Build...
:: Agora o arquivo existe, vamos disparar o build
call gradlew.bat assembleDebug

echo [6/7] Instalando no Moto G54...
cd ..
call npx cap run android --target 0085345209

echo [7/7] SUCESSO!
pause
