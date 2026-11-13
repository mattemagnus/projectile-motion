# Kaströrelse – interaktiv fysikillustration

Webbsidan fungerar direkt i en vanlig webbläsare. Den använder bara vanliga HTML-, CSS- och JavaScript-filer och behöver varken byggas eller installeras.

## Öppna sidan

Öppna `index.html` i en webbläsare. Ändra reglagen för starthastighet och kastvinkel. Starta, pausa eller återställ sedan animeringen. Under rörelsen visas tiden, bollens position och hastighetskomponenterna; flygtid, räckvidd och maxhöjd beräknas för det valda kastet.

## Ändra undervisningstext eller fysik

- **`content.js`** innehåller rubriker, instruktioner, formler och övriga texter som visas på sidan.
- **`physics.js`** innehåller standardvärden, reglagens tillåtna intervall och fysikens beräkningar. Tyngdaccelerationen är konstant och kan ändras där.
- **`styles.css`** styr sidans utseende.
- **`app.js`** kopplar reglagen till beräkningarna och ritar banan. Den behöver vanligtvis inte ändras när du justerar texter eller värden.

Modellen antar att luftmotstånd saknas, att tyngdaccelerationen är konstant och att bollen startar och landar på samma höjd.

## Publicera på GitHub Pages

1. Skapa ett nytt repository på GitHub.
2. I repositoryt väljer du **Add file** → **Upload files** och drar in projektets filer. Se till att `index.html` ligger i repositoryts rotmapp, inte i en undermapp.
3. Öppna repositoryts **Settings** → **Pages**.
4. Under **Build and deployment**, välj **Deploy from a branch**.
5. Välj grenen `main` och mappen `/(root)`, och klicka **Save**.
6. När publiceringen är klar (det kan ta några minuter) visar GitHub Pages en länk till webbsidan. Eleverna kan öppna länken utan att installera något.

Efter ändringar kan filerna laddas upp till samma repository igen. GitHub Pages publicerar den uppdaterade sidan automatiskt.
