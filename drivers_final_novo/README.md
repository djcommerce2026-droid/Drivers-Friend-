
# Driver's Friend - Guia Final para Build APK/iOS

Este projeto está pronto para ser compilado como um aplicativo nativo usando o Capacitor.

## Comandos de Build

### 1. Build da Web
Gera a pasta `dist` otimizada:
```bash
npm run build
```

### 2. Sincronização Nativa
Sincroniza o código web com as plataformas Android e iOS:
```bash
npx cap sync
```

### 3. Rodar no Android (APK Debug)
```bash
npx cap run android
```
Para gerar o APK final:
Abra o Android Studio com `npx cap open android` e vá em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

### 4. Rodar no iOS
```bash
npx cap run ios
```

## Permissões Incluídas
O app já vem configurado com:
- **Localização:** Para rastreio de KM em tempo real.
- **Sobreposição (Overlay):** Para o ícone flutuante sobre outros apps.
- **Notificações:** Para lembretes de manutenção.
- **Câmera:** Para upload de documentos ou foto de perfil.
- **Rede:** Detecção de conexão para mapas.

## Dica de Performance
O app foi desenhado para ser 100% offline (LocalStorage), garantindo que você nunca perca dados de corridas mesmo em áreas sem sinal.
