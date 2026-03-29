cd /storage/emulated/0/Download/
unzip "driver's-friend.zip" -d driversfriend
cd driversfriend
ls -la
npm install
npm run build
# 1. Usar --no-bin-links (essencial no Termux)
rm -rf node_modules package-lock.json
npm install --no-bin-links
# 2. Instalar Node.js LTS se não tiver
pkg install nodejs-lts -y
cd ~
cp -r /storage/emulated/0/Download/driversfriend .
cd driversfriend
rm -rf node_modules package-lock.json
npm install --no-bin-links --no-optional
# 1. Build frontend (Vite → dist/)
npm run build
# 2. Sync Capacitor (copia dist para android/)
npx cap sync android
# 3. Build APK Android
cd android
./gradlew assembleDebug
nano app/src/main/AndroidManifest.xml
# Volte para root e instale
cd ~/driversfriend
pkg install openjdk-17 gradle -y
# Regenerar gradle wrapper
cd android
./gradlew wrapper  # Se falhar, veja abaixo
# Build APK
./gradlew assembleDebug
cd ~/driversfriend/android
gradle wrapper
./gradlew assembleDebug
echo "sdk.dir=/data/data/com.termux/files/usr/opt/android-sdk" > local.properties
pkg install android-sdk -y || pkg install android-tools -y
mkdir -p $PREFIX/opt/android-sdk/cmdline-tools/latest/bin
# 1. Criar local.properties (aponta pro SDK do Termux)
echo "sdk.dir=/data/data/com.termux/files/usr/share/android-sdk" > local.properties
# 2. Build APK
./gradlew assembleDebug
# 1. Criar pasta SDK
cd ~
mkdir -p android-sdk/cmdline-tools
cd android-sdk/cmdline-tools
# 2. Download cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mv cmdline-tools latest
# 3. Variáveis
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
# 4. Instalar plataformas (SDK 34!)
yes | sdkmanager --licenses
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
pkg install wget unzip -y
# 1. Baixar cmdline-tools (~150MB)
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
# 2. Extrair
unzip commandlinetools-linux-11076708_latest.zip
mv cmdline-tools latest
# 3. Variáveis de ambiente
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
# 4. Aceitar licenças + instalar SDK 34
yes | sdkmanager --licenses
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
# Voltar projeto
cd ~/driversfriend/android
# Configurar SDK path
echo "sdk.dir=$HOME/android-sdk" > local.properties
# Build APK com suas permissões GPS
./gradlew assembleDebug
# 1. Limpar cache Gradle
./gradlew clean
# 2. Seu AndroidManifest com permissões GPS
cat > app/src/main/AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <application android:allowBackup="true" android:icon="@mipmap/ic_launcher" android:label="@string/app_name" android:roundIcon="@mipmap/ic_launcher_round" android:supportsRtl="true" android:theme="@style/AppTheme" android:usesCleartextTraffic="true" tools:targetApi="35">
        <activity android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode" android:name=".MainActivity" android:label="@string/app_name" android:theme="@style/AppTheme.NoActionBarLauncher" android:launchMode="singleTask" android:exported="true" android:supportsPictureInPicture="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <service android:name="io.capawesome.capacitor.androidforegroundservice.AndroidForegroundService" android:enabled="true" android:exported="false" android:foregroundServiceType="location" />
    </application>
</manifest>
EOF

# 3. Config SDK
echo "sdk.dir=$HOME/android-sdk" > local.properties
# 4. Build debug APK
./gradlew assembleDebug --warning-mode none
cd ~/driversfriend
# 1. Sync + Build Capacitor (automático)
npx cap sync android
npx cap build android --android-studio false
cp android/app/build/outputs/apk/debug/app-debug.apk /storage/emulated/0/Download/
cd android
./gradlew assembleDebug --warning-mode none --stacktrace
# 1. Instalar APKtool (gera APK sem Gradle)
pkg install apktool aapt apksigner d8 -y
# 2. Usar APK existente como base
cd /storage/emulated/0/Download/
apktool d DriversFriend_NOVO_TESTE.apk -o driversfriend-decompiled
# 3. Copiar seu web assets
cp -r ~/driversfriend/dist/* driversfriend-decompiled/assets/
# 4. Seu Manifest com permissões
cp ~/driversfriend/android/app/src/main/AndroidManifest.xml driversfriend-decompiled/
# 5. Rebuild APK
cd driversfriend-decompiled
apktool b -o DriversFriend_Final.apk
# 6. Sign APK
apksigner sign --ks ~/.android/debug.keystore DriversFriend_Final.apk
# 1. Instalar APKtool via GitHub
cd ~
git clone https://github.com/Lexiie/Termux-Apktool
cd Termux-Apktool
dpkg -i apktool_*.deb
pkg install apksigner -y
# 2. Decompile APK base
cd /storage/emulated/0/Download/
apktool d DriversFriend_NOVO_TESTE.apk -o driversfriend_mod
# 3. Substituir assets pelo seu build Vite
rm -rf driversfriend_mod/assets/*
cp -r ~/driversfriend/dist/* driversfriend_mod/assets/
# 4. Seu Manifest GPS
cat > driversfriend_mod/AndroidManifest.xml << 'EOF'
[COLE SEU XML COMPLETO]
EOF

# 5. Rebuild + Sign
cd driversfriend_mod
apktool b -o DriversFriend_Final.apk
apksigner sign --ks ~/.android/debug.keystore DriversFriend_Final.apk
# 6. Instalar
cp DriversFriend_Final.apk /storage/emulated/0/Download/
cd ~
git clone https://github.com/Lexiie/Termux-Apktool
# 1. Instalar APKtool do clone
cd Termux-Apktool
chmod +x install.sh
./install.sh
# 2. Ir Download + decompile
cd /storage/emulated/0/Download/
apktool d DriversFriend_NOVO_TESTE.apk -o driversfriend_mod
# 3. Substituir assets pelo seu dist/ Vite
rm -rf driversfriend_mod/assets/*
cp -r ~/driversfriend/dist/* driversfriend_mod/assets/
# 4. Seu Manifest GPS
cat > driversfriend_mod/AndroidManifest.xml << 'EOF'
[past seu XML completo aqui]
EOF

# 5. Rebuild APK
cd driversfriend_mod
apktool b -o DriversFriend_Final.apk
# 6. Sign
apksigner sign --ks ~/.android/debug.keystore DriversFriend_Final.apk
# 1. Instalar APKtool .deb (Lexiie repo)
cd ~/Termux-Apktool
ls *.deb  # Veja apktool_*.deb
dpkg -i apktool_*.deb
pkg install apksigner -y
# 2. Debug keystore (senha padrão android)
keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
# 3. Download + decompile
cd /storage/emulated/0/Download/
apktool d DriversFriend_NOVO_TESTE.apk -o driversfriend_mod
# 4. Seu dist/ Vite nos assets
rm -rf driversfriend_mod/assets/*
cp -r ~/driversfriend/dist/* driversfriend_mod/assets/
# 5. Seu Manifest GPS
cat > driversfriend_mod/AndroidManifest.xml << 'EOF'
[SEU XML COMPLETO AQUI]
EOF

# 6. Rebuild + Sign
cd driversfriend_mod
apktool b -o DriversFriend_Final.apk
apksigner sign --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android DriversFriend_Final.apk
# 1. Ir projeto + sync final
cd ~/driversfriend
npx cap sync android
# 2. Config SDK + Manifest (já feito)
cd android
echo "sdk.dir=$HOME/android-sdk" > local.properties
# 3. Limpar + Build APK
./gradlew clean
./gradlew assembleDebug --no-daemon
ls ~/driversfriend  # Confirma package.json, capacitor.config.ts, android/
~/driversfriend/android $ ls ~/driversfriend  # Confirma package.json, capacitor.config.ts, android/            App.tsx              index.tsx
README.md            metadata.json
android              node_modules                       build.bat            package-lock.json                  capacitor-env.d.ts   package.json                       capacitor.config.ts  postcss.config.js
components           services
data                 store                              dist                 types.ts                           eslint.config.js     utils                              index.css            vite.config.ts                     index.html                                              ~/driversfriend/android $
nano app/src/main/AndroidManifest.xml
# 1. Voltar root + sync final
cd ~/driversfriend
npx cap sync android
# 2. Config SDK
cd android
echo "sdk.dir=$HOME/android-sdk" > local.properties
# 3. Limpar + build APK
./gradlew clean
./gradlew assembleDebug --no-daemon --warning-mode none
./gradlew wrapper --gradle-version 8.10.2
rm -rf .gradle
rm -rf build
rm -rf app/build
./gradlew assembleDebug --no-daemon
> app/src/main/AndroidManifest.xml
nano app/src/main/AndroidManifest.xml
./gradlew assembleDebug --no-daemon
mkdir -p ~/android-sdk/platforms/android-35
ln -sf /data/data/com.termux/files/usr/share/android-sdk/platforms/android-35/android.jar ~/android-sdk/platforms/android-35/android.jar
ls -lh ~/android-sdk/platforms/android-35/android.jar
rm -rf app/build/intermediates/res/merged/debug
rm -rf app/build/intermediates/incremental/mergeDebugResources
./gradlew assembleDebug --no-daemon
rm ~/android-sdk/platforms/android-35/android.jar
cp /data/data/com.termux/files/usr/share/android-sdk/platforms/android-35/android.jar ~/android-sdk/platforms/android-35/android.jar
ls -lh ~/android-sdk/platforms/android-35/android.jar
echo "sdk.dir=/data/data/com.termux/files/home/android-sdk" > local.properties
echo "android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2" >> local.properties
rm -rf app/build/intermediates
./gradlew assembleDebug --no-daemon
chmod 644 ~/android-sdk/platforms/android-35/android.jar
export PATH=$PATH:/data/data/com.termux/files/usr/bin
chmod +x /data/data/com.termux/files/usr/bin/aapt2
rm -rf app/build/intermediates/res
rm -rf app/build/intermediates/incremental/mergeDebugResources
./gradlew assembleDebug --no-daemon
chmod 644 ~/android-sdk/platforms/android-35/android.jar
ls -lh ~/android-sdk/platforms/android-35/android.jar
rm -rf app/build/intermediates/res
rm -rf app/build/intermediates/incremental/mergeDebugResources
./gradlew assembleDebug --no-daemon
echo "sdk.dir=/data/data/com.termux/files/usr/share/android-sdk" > local.properties
echo "android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2" >> local.properties
chmod 644 /data/data/com.termux/files/usr/share/android-sdk/platforms/android-35/android.jar
rm -rf app/build/intermediates
rm -rf .gradle/checksums
./gradlew assembleDebug --no-daemon
# Remove a linha que força o aapt2 do sistema
sed -i '/android.aapt2FromMavenOverride/d' local.properties
whoami # Apenas para confirmar seu usuário (ex: u0_a359)
chmod -R 755 /data/data/com.termux/files/usr/share/android-sdk
rm -rf app/build/intermediates/res
rm -rf app/build/intermediates/incremental
./gradlew assembleDebug --no-daemon --info
rm -rf /data/data/com.termux/files/usr/share/android-sdk/platforms/android-35
rm -rf ~/android-sdk/platforms/android-35
# Aponta o SDK para uma pasta nova na sua home
mkdir -p ~/android-sdk-clean
echo "sdk.dir=/data/data/com.termux/files/home/android-sdk-clean" > local.properties
./gradlew assembleDebug --no-daemon
sdkmanager --sdk_root=$HOME/android-sdk-clean --licenses
./gradlew assembleDebug --no-daemon
echo "android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2" >> local.properties
chmod +x /data/data/com.termux/files/usr/bin/aapt2
mkdir -p ~/android-sdk-clean/build-tools/34.0.0
cp /data/data/com.termux/files/usr/bin/aapt2 ~/android-sdk-clean/build-tools/34.0.0/aapt2
rm -rf .gradle
rm -rf app/build/intermediates
./gradlew assembleDebug --no-daemon
curl -L https://github.com/vmos-project/vmos-android-sdk/raw/master/platforms/android-35/android.jar -o ~/android-sdk-clean/platforms/android-35/android.jar
rm ~/android-sdk-clean/platforms/android-35/android.jar
ls -lh ~/android-sdk-clean/platforms/android-35/android.jar
mkdir -p ~/android-sdk-clean/platforms/android-35
curl -L https://repo1.maven.org/maven2/com/google/android/android/15.0.0_r1/android-15.0.0_r1.jar -o ~/android-sdk-clean/platforms/android-35/android.jar
rm ~/android-sdk-clean/platforms/android-35/android.jar
wget https://dl.google.com/android/repository/platform-35_r01.zip -O ~/sdk_temp.zip
unzip -j ~/sdk_temp.zip "android-35/android.jar" -d ~/android-sdk-clean/platforms/android-35/
rm ~/sdk_temp.zip
unzip -j ~/sdk_temp.zip "android-35/android.jar" -d ~/android-sdk-clean/platforms/android-35/
rm ~/sdk_temp.zip
ls -lh ~/android-sdk-clean/platforms/android-35/android.jar
rm -rf app/build/intermediates/res
rm -rf app/build/intermediates/incremental
./gradlew assembleDebug --no-daemon
nano app/build.gradle
mkdir -p ~/android-sdk-clean/platforms/android-34
wget https://dl.google.com/android/repository/platform-34_r03.zip -O ~/sdk_34.zip
unzip -j ~/sdk_34.zip "android-34/android.jar" -d ~/android-sdk-clean/platforms/android-34/
rm ~/sdk_34.zip
wget https://dl.google.com/android/repository/platform-34_r03.zip -O ~/sdk_34.zip
sdkmanager --sdk_root=$HOME/android-sdk-clean "platforms;android-34"
ls -lh ~/android-sdk-clean/platforms/android-34/android.jar
chmod 644 ~/android-sdk-clean/platforms/android-34/android.jar
ls -lh ~/android-sdk-clean/platforms/android-34/android.jar
# Limpa caches de builds anteriores que falharam
rm -rf .gradle
rm -rf app/build
# Executa a compilação
./gradlew assembleDebug --no-daemon
cat app/src/main/res/values/styles.xml
nano app/src/main/AndroidManifest.xml
./gradlew clean assembleDebug --no-daemon
truncate -s 0 app/src/main/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
</manifest>
nano app/src/main/AndroidManifest.xml
./gradlew clean assembleDebug --no-daemon
