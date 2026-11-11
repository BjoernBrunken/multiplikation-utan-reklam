# Tabellträning – multiplikationsträning utan reklam (fungerar offline)

En egen övningssida för multiplikation och division för låg- och mellanstadiet. Ingen reklam, inget konto, ingen spårning.

*English: An ad-free, tracking-free times-tables trainer for Swedish primary school pupils. Runs fully offline – just open `index.html`. Free software under GPL-3.0.*

## Ladda ner
1. Klicka på den gröna knappen **Code → Download ZIP** här på GitHub.
2. Packa upp ZIP-filen på datorn (eller ett USB-minne).
3. Dubbelklicka på `index.html`. Klart – ingen installation och inget internet behövs.

## Så använder du den
- **Utan internet:** kopiera hela mappen (till datorn eller ett USB-minne) och dubbelklicka på `index.html`. Ingen server eller internetanslutning behövs.
- **Som app (valfritt):** om mappen ligger på en webbserver (t.ex. skolans server) kan sidan installeras som app i webbläsaren och fungerar då även offline (service worker `sw.js`).
- **Flera elever på samma enhet:** varje elev väljer sitt namn och sitt djur när sidan öppnas. Inget lösenord, inget konto.
- Resultat sparas bara lokalt i webbläsaren (`localStorage`), separat för varje elev. Under **För lärare och föräldrar** (länk längst ner) finns en översikt över alla elever, och resultaten kan **exporteras till en fil** och **importeras** på en annan dator.

## Var sparas resultaten?
Allt sparas i webbläsarens lokala lagring (`localStorage`) på datorn – inget skickas någonstans.
Det betyder:
- Varje webbläsare och varje Windows-användare har sina egna data (Edge ser inte det som sparats i Chrome).
- Data försvinner om webbläsardata rensas eller om skolans datorer återställs vid utloggning.
- **Gör därför en säkerhetskopia:** *För lärare och föräldrar → Exportera alla till fil*. Med *Importera från fil* läser du in den igen, även på en annan dator.

## Innehåll
| Del | Vad den gör |
|---|---|
| Dagens plan (startsidan) | Dagens utmaning (10 frågor, dagar i rad – helger räknas inte), tabeller som ska repeteras, knepiga tal och djurkort |
| Öva | Tabellerna 1–12, växla mellan Gånger (·) och Delat (/). Varje tabell har 5 steg med medaljer: Läs & skriv, Para ihop, Blandat, Flerval och Tabelltest (+ diplom att skriva ut) |
| Snabbtest | Välj tabeller, 10 sekunder per fråga, 10 poäng + sekunderna som är kvar, lista med fel, skriv ut resultatet |
| 100 sekunder | Svara rätt på så många som möjligt på 100 sekunder. Frågorna blir svårare, man får ett andra försök vid fel. Stjärnor och rekord |
| Diplom | Litet (30 frågor, tabell 1–5 och 10) eller stort (40 frågor, tabell 1–12). 6 minuter, alla rätt → diplom att skriva ut |
| Tabellen | Multiplikationstabellen 12 × 12. Tryck på en ruta och se talet som en rektangel av prickar. Svaren kan gömmas. Kan skrivas ut |
| Kalkylblad | Skapar arbetsblad: vanliga uppgifter, saknat tal eller dra streck. Med facit |
| Spel | Memory (1–2 spelare), Tabellregn och Duell (två spelare på samma surfplatta) |
| Arcade | Fyra egna arkadspel med piltangenter och mellanslag: **Rymdkanonen** (skjut skeppet med rätt svar), **Sifferormen** (styr ormen till rätt tal), **Tegelkrossen** (studsa bollen på stenen med rätt svar) och **Över ån** (hoppa på båten med rätt svar). Rekord per elev, fel svar hamnar bland knepiga, ljud av som standard |
| Troféskåp | Alla medaljer, djurkort, diplom och rekord |
| Knep | Varje tabell har ett knep (t.ex. fingertricket för 9:ans och "5, 6, 7, 8" för 7:ans). Division: "gånger baklänges" |
| Mina knepiga | Tal som eleven svarat fel på eller tänkt länge på (över 8 sekunder) övas extra tills de klarats 3 gånger i rad |
| Repetition | När tabelltestet är klart kommer tabellen tillbaka efter 2, 7, 21 och 60 dagar |
| Vad kan jag? | I Tabellen: grönt = kan, orange = knepigt, grått = inte övat än |
| Djurkort | 32 djurkort med en gånger-fakta på varje. Nytt kort för varannan medalj, dagens utmaning och diplom |
| Hela klassen | För tavlan: tävla mot klassrekordet eller bildspel (fråga – betänketid – svar). Helskärm |
| För lärare och föräldrar | Översikt över alla elever, byt namn, ta bort, export och import, kalkylblad |

## Teknik
Bara HTML, CSS och JavaScript, utan byggsteg och utan externa beroenden. Vanliga skript (inga ES-moduler) så att allt fungerar via `file://`.
Typsnitten Andika och Fredoka ligger lokalt i `fonts/` (SIL Open Font License).

```
index.html        sidans stomme och meny
css/style.css     utseende (rutat mattepapper)
js/core.js        lagring (elevprofiler), router, knappsats, frågesport, prickbilder, diplom
js/learn.js       knepiga tal, repetition, dagens utmaning, djurkort, knep
js/profiles.js    välj elev, ny elev, sidan för vuxna (export/import)
js/classroom.js   hela klassen på tavlan
js/home.js        startsidan och "Om sidan"
js/practice.js    de 5 övningsstegen för varje tabell
js/tests.js       Snabbtest, 100 sekunder, Diplom
js/tools.js       Tabellen, Kalkylblad, Troféskåp
js/games.js       Memory, Tabellregn, Duell
js/arcade.js      arkadmotor + Rymdkanonen, Sifferormen, Tegelkrossen, Över ån
sw.js, manifest.json, icon.svg   installerbar app (bara via http/https)
```

## Licens och upphovsperson
Copyright © 2026 **Björn Brunken**

Tabellträning är fri programvara: du får använda, kopiera, ändra och dela den enligt
**GNU General Public License version 3** eller (om du vill) en senare version (GPL-3.0-or-later).
Ändrade versioner som delas måste också vara fria och ha samma licens. Hela licenstexten finns i [LICENSE](LICENSE).

Typsnitt (oförändrade, under SIL Open Font License 1.1):
- **Andika** – Copyright © 2004–2022 SIL International ([fonts/OFL-Andika.txt](fonts/OFL-Andika.txt))
- **Fredoka** – Copyright © 2016 The Fredoka Project Authors ([fonts/OFL-Fredoka.txt](fonts/OFL-Fredoka.txt))

Tabellträning är ett eget arbete. Texter, bilder och spel är egna och har ingen koppling till andra webbplatser för multiplikationsträning.

Förbättringar och idéer är välkomna – öppna gärna ett *issue* eller en *pull request*.
