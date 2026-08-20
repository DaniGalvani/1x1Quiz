# 1x1-Held – Das Einmaleins-Quiz

1x1-Held ist eine kindgerechte Web-App zum Üben des kleinen Einmaleins und der passenden Geteiltaufgaben. Die Anwendung bietet zwölf Spielmodi, mehrere Spielerprofile, Statistiken, persönliche Bestleistungen, Abzeichen, einen Abenteuer-Fortschritt und einen lokalen Zwei-Spieler-Modus.

Die App besteht ausschließlich aus HTML, CSS und JavaScript. Es gibt keine externen Abhängigkeiten, keinen Build-Schritt und kein Backend. Alle Spielstände bleiben lokal im Browser. Dank Web-App-Manifest und Service Worker lässt sich 1x1-Held außerdem installieren und nach dem ersten vollständigen Laden offline verwenden.

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Schnellstart](#schnellstart)
- [Spielanleitung](#spielanleitung)
- [Spielmodi](#spielmodi)
- [Punkte, Serien und Sterne](#punkte-serien-und-sterne)
- [Fortschritt und Motivation](#fortschritt-und-motivation)
- [Spielstände sichern und laden](#spielstände-sichern-und-laden)
- [Installation als App und Offline-Nutzung](#installation-als-app-und-offline-nutzung)
- [Technischer Überblick](#technischer-überblick)
- [Projektstruktur](#projektstruktur)
- [Anpassungen und Weiterentwicklung](#anpassungen-und-weiterentwicklung)
- [Bereitstellung](#bereitstellung)
- [Fehlerbehebung](#fehlerbehebung)

## Funktionen

- Reihen von 2 bis 10 einzeln oder gemeinsam auswählbar
- Zwölf unterschiedliche Spielmodi
- Drei geführte Geteilt-Modi mit schriftlicher Rechnung untereinander
- Spielerprofile mit schneller Namensauswahl
- Lokales Duell für zwei Personen an einem Gerät
- Automatisches Fehler-Training pro Spieler
- Abenteuer-Modus mit freischaltbaren Reihen und bis zu 27 Sternen
- Punkte- und Serienbonus mit unmittelbarem Feedback
- Ranglisten und persönliche Bestleistungen je geeignetem Spielmodus
- Erfolgsstatistik für jede Einmaleins-Reihe
- Tagesziel und fortlaufende Tages-Serie
- Zwölf freischaltbare Abzeichen
- Ton, Animationen, Konfetti und unterstützte Vibration auf Mobilgeräten
- Bedienung per Touch, Maus oder Tastatur
- Lokale JSON-Datensicherung und Wiederherstellung
- Installierbare Progressive Web App (PWA)
- Offline-Betrieb über einen Service Worker
- Responsives Layout für Smartphone, Tablet und Desktop

## Schnellstart

### Voraussetzungen

Zum Spielen wird nur ein moderner Browser benötigt. Für Installation und Offline-Unterstützung muss die App über `http://` oder `https://` ausgeliefert werden. Beim direkten Öffnen von `index.html` über `file://` kann das Quiz zwar grundsätzlich laufen, der Service Worker wird dann jedoch nicht registriert.

### Variante 1: Mit Python starten

Öffne ein Terminal im Projektverzeichnis und starte einen kleinen lokalen Webserver:

```powershell
python -m http.server 8080
```

Rufe anschließend diese Adresse im Browser auf:

```text
http://localhost:8080
```

Falls auf deinem System der Python-Launcher `py` verwendet wird:

```powershell
py -m http.server 8080
```

### Variante 2: Mit Node.js starten

Wenn Node.js installiert ist, kann die App zum Beispiel mit `serve` ausgeliefert werden:

```powershell
npx serve .
```

Öffne danach die im Terminal angezeigte lokale Adresse.

### Server beenden

Drücke im Terminal `Strg+C`.

## Spielanleitung

1. Trage auf dem Startbildschirm deinen Namen ein. Namen dürfen höchstens 16 Zeichen lang sein. Bereits bekannte Spieler erscheinen später als Schnellwahl.
2. Wähle eine oder mehrere Reihen zwischen 2 und 10. Mit **Alle gemischt** werden alle Reihen gemeinsam aktiviert. Im Fehler-Training und im Abenteuer wird die Reihenauswahl automatisch bestimmt.
3. Wähle einen Spielmodus.
4. Klicke auf **Los geht's!**. Im Abenteuer startest du stattdessen ein freigeschaltetes Level direkt über die Level-Karte.
5. Gib die Lösung über den Ziffernblock ein und bestätige mit **OK**. In den Geteilt-Modi schreibst du selbst nacheinander die Ergebnisziffer, das Produkt zum Abziehen und den Rest beziehungsweise die heruntergeholte Zahl an die richtige Stelle. Den erklärenden Hilfetext unter der Rechnung kannst du jederzeit ein- oder ausblenden. Im Modus **Stimmt's?** wählst du **Stimmt** oder **Stimmt nicht**.
6. Nach jeder Antwort zeigt die App sofort an, ob die Lösung richtig war. Bei einer falschen Antwort wird zusätzlich die korrekte Rechnung eingeblendet.
7. Am Rundenende siehst du Punkte, richtige und falsche Antworten, die beste Serie sowie die verdienten Sterne.

Die Schaltfläche mit dem Haus beendet die aktuelle Runde und führt zum Menü zurück. Sobald bereits mindestens eine Aufgabe beantwortet wurde, fragt die App vor dem Abbruch nach einer Bestätigung. Über das Lautsprecher-Symbol lässt sich der Ton dauerhaft ein- oder ausschalten.

### Tastatursteuerung

Während eines normalen Quiz können zusätzlich folgende Tasten verwendet werden:

| Taste | Aktion |
| --- | --- |
| `0` bis `9` | Ziffer eingeben |
| `Backspace` | Letzte Ziffer löschen |
| `Enter` | Antwort bestätigen |

Auf dem Startbildschirm startet `Enter` eine spielbereite Runde. Im Abenteuer werden Level über die Level-Karte ausgewählt. Der Modus **Stimmt's?** wird über die beiden sichtbaren Schaltflächen bedient.

## Spielmodi

| Modus | Ablauf | Ende der Runde | Rangliste |
| --- | --- | --- | --- |
| **Übungsrunde** | Normale Multiplikationsaufgaben | Nach 20 Aufgaben | Ja |
| **Blitzmodus** | So viele Multiplikationsaufgaben wie möglich | Nach 60 Sekunden | Ja |
| **Lücken-Modus** | Fehlenden Faktor ergänzen, zum Beispiel `4 × ? = 28` | Nach 20 Aufgaben | Ja |
| **Geteilt-Start** | Einstellige Ergebnisse schriftlich und geführt teilen | Nach 20 Aufgaben | Ja |
| **Schriftlich geteilt** | Geteiltaufgaben mit zweistelligem Ergebnis Ziffer für Ziffer lösen | Nach 15 Aufgaben | Ja |
| **Geteilt-Profi** | Große Geteiltaufgaben mit dreistelligem Ergebnis schriftlich lösen | Nach 12 Aufgaben | Ja |
| **Stimmt's?** | Entscheiden, ob eine gezeigte Rechnung richtig oder falsch ist | Nach 20 Aufgaben | Ja |
| **Überleben** | Multiplikationsaufgaben mit drei Leben | Nach dem dritten Fehler | Ja |
| **Zeit-Rennen** | Start mit 20 Sekunden; jede richtige Antwort gibt 3 Sekunden dazu | Wenn die Zeit abläuft | Ja |
| **Fehler-Training** | Zuvor falsch beantwortete Aufgaben gezielt wiederholen | Nach 15 Aufgaben oder sobald der Fehler-Pool leer ist | Nein |
| **Duell** | Zwei Spieler lösen nacheinander je 10 Aufgaben am selben Gerät | Nach beiden Durchgängen | Nein |
| **Abenteuer** | Die Reihen von 2 bis 10 nacheinander meistern; jedes Level enthält 12 Aufgaben | Nach 12 Aufgaben | Nein |

Im Zeit-Rennen kann die verbleibende Zeit durch Bonussekunden höchstens auf 45 Sekunden steigen.

### Schriftliche Division

Die drei Geteilt-Modi verwenden die aus dem Schulheft bekannte Schreibweise. Das Kind trägt alle Zahlen selbst ein: zuerst die Ergebnisziffer, dann das Produkt unter der aktuellen Teilzahl und anschließend den Rest mit der gegebenenfalls heruntergeholten Ziffer. Der optionale Hilfetext beginnt mit „Wie oft geht die … in die …?“ und führt auch durch das Multiplizieren, Abziehen und Herunterholen. Die Aufgaben gehen ohne Rest auf und richten sich nach den ausgewählten Reihen.

### Intelligente Aufgabenauswahl

Bei regulären Multiplikationsaufgaben zieht die App mehrere mögliche Rechnungen in Betracht und bevorzugt tendenziell Aufgaben, die bereits falsch beantwortet wurden oder zu einer statistisch schwächeren Reihe gehören. Direkt aufeinanderfolgende identische Aufgaben werden nach Möglichkeit vermieden.

### Fehler-Training

Jede falsch beantwortete Multiplikationsaufgabe landet im persönlichen Fehler-Pool. Eine Aufgabe gilt als ausgebügelt, wenn sie im Fehler-Training zweimal richtig gelöst wurde. Ein weiterer Fehler setzt diesen Zähler wieder zurück. Der Modus kann nur gestartet werden, wenn für den gewählten Spieler mindestens eine Aufgabe offen ist.

### Duell

Im Duell werden der aktive Spieler und ein Gegner eingetragen. Beide spielen mit denselben gewählten Reihen nacheinander jeweils zehn Aufgaben. Nach dem ersten Durchgang fordert die App dazu auf, das Gerät weiterzugeben. Am Ende werden beide Ergebnisse direkt verglichen. Duell-Ergebnisse werden nicht in die normalen Ranglisten eingetragen.

### Abenteuer

Das Abenteuer beginnt mit der 2er-Reihe. Ein Level schaltet die nächste Reihe frei, sobald mindestens zwei Sterne erreicht wurden. Bereits erspielte Sterne bleiben erhalten; ein besseres späteres Ergebnis ersetzt den bisherigen Wert. Für alle neun Reihen können zusammen maximal 27 Sterne gesammelt werden.

## Punkte, Serien und Sterne

### Punkte

Eine richtige Antwort bringt mindestens 10 Punkte. Für mehrere richtige Antworten in Folge kommt ein Serienbonus hinzu:

| Richtige Antwort innerhalb der aktuellen Serie | Punkte |
| --- | ---: |
| 1. | 10 |
| 2. | 12 |
| 3. | 14 |
| 4. | 16 |
| 5. | 18 |
| Ab der 6. | 20 |

Eine falsche Antwort bringt keine Punkte und setzt die aktuelle Serie auf null. Die beste Serie der Runde wird separat festgehalten.

### Sterne

Die Sterne richten sich nach dem Anteil richtiger Antworten:

| Genauigkeit | Sterne |
| --- | ---: |
| Mindestens 90 % | 3 |
| Mindestens 70 % | 2 |
| Unter 70 % | 1 |

Im Abenteuer sind mindestens zwei Sterne nötig, um das folgende Level freizuschalten.

### Ranglisten

Für jeden ranglistenfähigen Modus wird pro Spieler nur die persönliche Bestleistung gespeichert. Die Ranglisten zeigen jeweils die besten acht Einträge. Spielernamen werden beim Vergleich ohne Beachtung der Groß- und Kleinschreibung behandelt.

## Fortschritt und Motivation

### Statistik je Reihe

Über **Statistik** lässt sich die bisherige Trefferquote jeder Reihe anzeigen:

- Grün: mindestens 90 % richtig
- Gelb: mindestens 70 % richtig
- Rot: unter 70 % richtig
- Grau: noch keine beantworteten Aufgaben

### Tagesziel

Das Tagesziel ist nach zehn beantworteten Aufgaben erreicht. Wird das Ziel an aufeinanderfolgenden Kalendertagen erfüllt, wächst die Tages-Serie. Ein ausgelassener Tag setzt die wirksame Serie zurück.

### Abzeichen

Folgende Erfolge können pro Spieler freigeschaltet werden:

| Abzeichen | Bedingung |
| --- | --- |
| Erste Runde | Die erste Runde abschließen |
| Serien-Star | 10 richtige Antworten in Folge |
| Serien-Meister | 20 richtige Antworten in Folge |
| Punktejäger | 300 Punkte in einer Runde |
| Fehlerfrei | Mindestens 10 Aufgaben ohne Fehler lösen |
| Tausender | Insgesamt 1.000 Punkte sammeln |
| Punkte-König | Insgesamt 5.000 Punkte sammeln |
| Ausgebügelt | Den Fehler-Pool im Fehler-Training vollständig leeren |
| Entdecker | Fünf verschiedene Modi ausprobieren |
| Abenteurer | Alle Abenteuer-Level mit mindestens zwei Sternen abschließen |
| Sternensammler | Alle 27 Abenteuer-Sterne holen |
| Dranbleiber | An sieben Tagen in Folge das Tagesziel erreichen |

## Spielstände sichern und laden

Alle Daten werden ausschließlich im `localStorage` des aktuellen Browsers und der aktuellen Website-Adresse gespeichert. Dazu gehören unter anderem:

- Spieler und zuletzt gewählter Name
- ausgewählte Reihen und Toneinstellung
- Ranglisten und persönliche Bestleistungen
- Statistiken und Fehler-Pools
- Abenteuer-Sterne
- Tagesziele und Tages-Serien
- Gesamtpunkte, gespielte Modi und Abzeichen

Die App sendet diese Informationen nicht an einen Server. Unterschiedliche Browser, Browserprofile, Geräte oder Website-Adressen besitzen jeweils getrennte Speicherbereiche.

### Sicherung erstellen

1. Klicke im Menü auf **Sichern**.
2. Der Browser lädt eine Datei nach dem Muster `1x1-held-sicherung-JJJJ-MM-TT.json` herunter.
3. Bewahre diese Datei an einem sicheren Ort auf.

### Sicherung wiederherstellen

1. Klicke auf **Laden**.
2. Wähle eine zuvor exportierte JSON-Sicherung aus.
3. Bestätige den Hinweis.
4. Die App ersetzt ihre aktuellen lokalen Daten durch die Sicherung und lädt die Seite neu.

> Achtung: Beim Import werden alle vorhandenen 1x1-Held-Daten für diese Website-Adresse ersetzt. Erstelle vorher eine aktuelle Sicherung, wenn du den bisherigen Stand behalten möchtest.

Das Löschen von Website-Daten im Browser entfernt ebenfalls alle nicht exportierten Spielstände.

## Installation als App und Offline-Nutzung

1x1-Held enthält ein Web-App-Manifest und einen Service Worker. Die genaue Bezeichnung der Installationsfunktion hängt vom Browser und Betriebssystem ab. Suche im Browsermenü nach einer Option wie **App installieren**, **Installieren** oder **Zum Startbildschirm hinzufügen**.

Für die Installation gelten folgende Voraussetzungen:

- Die App wird über `https://` oder lokal über `http://localhost` geöffnet.
- Alle App-Dateien konnten mindestens einmal erfolgreich geladen werden.
- Der verwendete Browser unterstützt installierbare Progressive Web Apps.

Nach dem ersten vollständigen Aufruf speichert der Service Worker die zentralen Dateien im Cache. Danach kann die App ohne Netzwerkverbindung gestartet werden. Spielstände bleiben unabhängig davon im lokalen Browser-Speicher.

## Technischer Überblick

- **HTML:** Semantische Bildschirmstruktur für Start, Quiz, Duell-Übergabe und Ergebnis
- **CSS:** Responsives, mobiloptimiertes Layout mit Animationen und ohne CSS-Framework
- **JavaScript:** Spielzustand, Aufgabengenerierung, Auswertung, Statistiken und lokale Speicherung
- **Web Audio API:** Direkt erzeugte Töne ohne Audiodateien
- **Web Animations API:** Konfetti-Effekte
- **Vibration API:** Kurzes Fehlerfeedback, sofern vom Gerät unterstützt
- **Web Storage API:** Lokale Spieler- und Fortschrittsdaten
- **File API und Blob API:** Export und Import der Sicherungsdateien
- **Service Worker und Cache API:** Offline-Bereitstellung
- **Web-App-Manifest:** Metadaten für die Installation

Es werden keine Bibliotheken, Paketmanager oder externen Webdienste benötigt.

## Projektstruktur

```text
.
├── index.html            # Oberfläche und alle App-Bildschirme
├── style.css             # Layout, Farben, Animationen und responsive Regeln
├── app.js                # Spielregeln, Bedienung, Statistiken und Speicherung
├── manifest.webmanifest  # PWA-Metadaten und Installationskonfiguration
├── sw.js                 # Offline-Cache und Service Worker
├── icon.svg              # App-, Browser- und Installationssymbol
└── README.md             # Dokumentation
```

## Anpassungen und Weiterentwicklung

### Reihen ändern

Die verfügbaren Reihen sind in `app.js` über die Konstante `ROWS` definiert:

```javascript
const ROWS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
```

Wenn weitere Reihen ergänzt werden, sollten auch Aufgabenlogik, Abenteuer-Reihenfolge, Statistik und mögliche Beschriftungen geprüft werden.

### Punkte und Tagesziel ändern

Die wichtigsten Werte stehen am Anfang von `app.js`:

```javascript
const BASE_POINTS = 10;
const STREAK_BONUS_STEP = 2;
const STREAK_BONUS_MAX = 10;
const TRAINING_CLEAR = 2;
const ZEITRENNEN_CAP = 45;
const DAILY_GOAL = 10;
```

### Spielmodi ändern

Die Konfiguration befindet sich im Objekt `MODES` in `app.js`. Dort werden Name, Beschreibung, Aufgabentyp und Endbedingung eines Modus festgelegt. Spezielle Logik wie Duell, Abenteuer oder Fehler-Pool wird über zusätzliche Eigenschaften in `rules` aktiviert.

### Gestaltung ändern

Farben, Schatten und Radien sind als CSS-Variablen am Anfang von `style.css` zusammengefasst. Die mobile Darstellung wird hauptsächlich über Media Queries am Ende der Datei gesteuert.

### Offline-Cache nach Änderungen aktualisieren

Der Service Worker verwendet eine Cache-Version in `sw.js`:

```javascript
const CACHE = 'einmaleins-v7';
```

Erhöhe diese Versionskennung, beispielsweise auf `einmaleins-v2`, wenn veröffentlichte App-Dateien geändert wurden. Beim Aktivieren des neuen Service Workers werden ältere Caches entfernt. Ergänze außerdem jede neue Datei, die offline verfügbar sein soll, im Array `ASSETS`.

Während der Entwicklung kann ein bereits aktiver Service Worker ältere Dateien aus dem Cache liefern. In diesem Fall helfen je nach Browser ein erzwungenes Neuladen, das Löschen der Website-Daten oder das Abmelden des Service Workers in den Entwicklerwerkzeugen.

### Tests

Das Projekt enthält derzeit keine automatisierte Test- oder Lint-Konfiguration. Prüfe Änderungen daher mindestens manuell in einem Desktop- und einem Mobilbrowser. Besonders wichtig sind:

- Start und Abschluss aller zwölf Modi
- alle drei Geteilt-Stufen mit richtigen und falschen Ergebnisziffern
- richtige und falsche Antworten sowie Serienbonus
- Zeitablauf, Leben, Duell-Übergabe und Abenteuer-Freischaltung
- getrennte Fortschritte für mehrere Spieler
- Export und anschließender Import einer Sicherung
- Installation, Neuladen und Offline-Start der PWA
- Darstellung bei schmalen und hohen Bildschirmgrößen

## Bereitstellung

Da 1x1-Held eine rein statische Anwendung ist, kann der gesamte Projektordner auf jedem statischen Webserver veröffentlicht werden. `index.html` muss zusammen mit `app.js`, `style.css`, `icon.svg`, `manifest.webmanifest` und `sw.js` im selben Verzeichnis liegen.

Für eine produktive Installation und den Service Worker sollte die Website per HTTPS ausgeliefert werden. Eine Ausnahme bildet `localhost`, das Browser üblicherweise auch über HTTP als sicheren Entwicklungskontext behandeln. Der Service Worker ist auf den Ordner begrenzt, in dem `sw.js` bereitgestellt wird.

## Fehlerbehebung

### Die App lässt sich nicht starten

- Trage einen Spielernamen ein.
- Wähle mindestens eine Reihe aus.
- Gib im Duell zusätzlich den Namen des Gegners ein.
- Im Fehler-Training müssen offene Fehleraufgaben vorhanden sein.
- Im Abenteuer wird die Runde über ein freigeschaltetes Level gestartet.

### Offline-Modus oder Installation fehlen

- Öffne die App über `http://localhost` oder eine HTTPS-Adresse, nicht über `file://`.
- Lade die App mindestens einmal vollständig mit Netzwerkverbindung.
- Prüfe, ob der Browser Service Worker und installierbare Web-Apps unterstützt.
- Prüfe in den Browser-Entwicklerwerkzeugen, ob `sw.js` und alle Einträge aus `ASSETS` erfolgreich geladen werden.

### Änderungen erscheinen nicht

Der Cache-first-Service-Worker kann noch eine ältere Version ausliefern. Erhöhe die Cache-Kennung in `sw.js` und lade die Seite neu. Während der lokalen Entwicklung kann zusätzlich das Löschen der Website-Daten oder das Abmelden des Service Workers nötig sein.

### Fortschritt ist verschwunden

Spielstände sind an Browser, Browserprofil und exakte Website-Adresse gebunden. Ein Wechsel von Port, Domain oder Protokoll erzeugt einen anderen Speicherbereich. Auch das Löschen der Browser- beziehungsweise Website-Daten entfernt den Fortschritt. Mit einer zuvor exportierten JSON-Datei kann er über **Laden** wiederhergestellt werden.

### Töne sind zunächst nicht hörbar

Browser erlauben Audio häufig erst nach einer bewussten Nutzeraktion. Starte eine Runde oder tippe auf eine Schaltfläche. Prüfe außerdem das Lautsprecher-Symbol und die Lautstärkeeinstellungen des Geräts.
