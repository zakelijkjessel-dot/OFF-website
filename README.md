# AutoPilotAI — website

Marketingwebsite voor **AutoPilotAI**: een AI-chatbot die klanten van
autobedrijven en garages via WhatsApp helpt.

## Wat de site laat zien
- Vragen beantwoorden (24/7)
- Afspraken inplannen, annuleren & verplaatsen
- Herinneringen via WhatsApp
- Slimme auto-intake (merk, type, kenteken, klacht) + tijdsinschatting in de agenda
- Prijsindicatie
- Foto-analyse (schade, banden)
- Slimme upselling (bv. kleine beurt bij een APK)
- Bevestiging via mail

## Techniek
Statische site, geen build-stap. Open `index.html` of serveer lokaal:

```bash
python3 -m http.server 8099
# http://localhost:8099
```

- `index.html` — structuur en content
- `css/styles.css` — design-tokens en componenten (dark cosmic stijl)
- `js/particles.js` — particle-constellatie (canvas, het merkbeeld)
- `js/main.js` — navigatie, mobiel menu en het demo-formulier

Design op basis van de meegeleverde stijlreferentie (dark "particle cosmos",
violet accent `#8052ff`).
