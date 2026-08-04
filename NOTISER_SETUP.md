# Volvo Masters – aktivera chattnotiser

Frontenddelen registrerar redan telefonens FCM-token och visar notiser när appen är öppen. Filerna i `functions/` skickar chattnotiser även när appen är stängd.

## 1. Kontrollera webbappen

I projektets rot:

```bash
npm install
npm run build
git add .
git commit -m "Add chat push notifications"
git push
```

Vänta tills Vercel är färdig. Öppna därefter appen på telefonen och tryck **Aktivera notiser**.

## 2. Installera Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use volvo-masters
```

## 3. Installera och publicera funktionen

Från projektets rot:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Firebase kan kräva att projektet använder betalplanen Blaze för Cloud Functions. Firebase debiterar normalt bara faktisk användning, men kontrollera projektets budget och kostnadsvarningar.

## 4. Test

1. Aktivera notiser på två olika telefoner.
2. Stäng Volvo Masters på telefon 2.
3. Skriv ett chattmeddelande från telefon 1.
4. Telefon 2 ska få en pushnotis.
5. Telefon 1 ska inte få notis om sitt eget meddelande.
6. Tryck på notisen – appen ska öppnas direkt i Chat.

## Felsökning

- Kontrollera att `pushTokens` innehåller dokument i Firestore.
- Kontrollera Firebase Functions-loggar med `firebase functions:log`.
- På Samsung: Inställningar → Appar → Volvo Masters → Aviseringar → Tillåt.
- Om den installerade webbappen använder gammal service worker: stäng appen helt, öppna den igen och ladda om sidan.
