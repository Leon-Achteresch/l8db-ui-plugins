# AGENTS.md

Dies ist die öffentliche Sammlung von UI-Plugins für l8db. Jedes Plugin liegt in `plugins/<id>/`, und nach dem Merge nach `main` erscheint es in der Galerie von l8db.

## Plugin schreiben

Lies zuerst `sdk/folder-agents.md` (Regeln, Slots, Optionen, Hilfen, Grenzen) und `sdk/l8db-ui.d.ts` (Typen). Die Anleitung ist für den Plugin-Ordner in l8db geschrieben. Im Repo gilt:

- Ein Plugin liegt nicht direkt im Ordner, sondern als `plugins/<id>/plugin.tsx`.
- Statt `.status.json` zu lesen, führst du `bun run check` aus. Der Typcheck ist dort Pflicht, nicht optional.
- Das Grundgerüst verdrahtet `sales.orders` fest. Plugins hier müssen auf fremden Datenbanken laufen, darum findest du Tabellen und Spalten über Optionen oder Namen, etwa eine kommagetrennte Liste von Spaltennamen.

`sdk/` ist eine Kopie aus dem l8db-Repo. Ändere dort nichts von Hand; neue Stände holt `bun run sync-sdk`.

Regeln für ein Plugin:

- Ordnername: `plugins/<herausgeber>.<name>/`. `herausgeber` ist dein GitHub-Name in Kleinbuchstaben.
- Inhalt des Ordners: genau eine Quelldatei `plugin.tsx` (oder `.ts`, `.jsx`, `.js`), ein eigener Screenshot `screenshot.png` (oder `.webp`, `.jpg`, höchstens 2 MB) und optional eine `README.md`, die nur auf GitHub erscheint.
- Die `id` entspricht dem Ordnernamen. Pflicht sind `name` (nicht gleich der `id`), `description`, `version` im Format `1.2.3` und `author` (dein Herausgebername).
- Alles, was Personen unterschiedlich haben wollen, wird eine Option mit sinnvollem Standardwert: Spalten, Tabellen, Schwellen und sichtbare Texte wie Knopf- und Tab-Labels. Feste Teile wie angehängte Fehlertexte dürfen im Code bleiben.
- `permissions.http` so eng wie möglich fassen, am besten mit Pfad. Die Ziele stehen fest im Code; nur der Teil darunter kann eine Option sein.
- Keine Kommentare im Code.

## Prüfen

Nach `bun install` führst du `bun run readme`, `bun run check` und `bun test scripts` aus; alle drei müssen ohne Fehler durchlaufen.

- `bun run readme` schreibt die Plugin-Liste in `README.md`, und diese Änderung gehört in den Pull Request. `bun run check` schlägt fehl, solange die Liste veraltet ist.
- `bun test scripts` testet nur die Prüfskripte selbst, nicht dein Plugin.

`bun run check` startet zuerst `tsc` (`strict`, ungenutzte Variablen und Parameter sind Fehler). Danach übersetzt er jedes Plugin mit denselben Regeln wie l8db und ruft jeden Slot mit den Beispieldaten aus `scripts/samples.ts` auf, einmal je Optionsvariante. Optionsvarianten sind:

- die Standardwerte;
- dazu je Option genau eine Abweichung: Booleans umgedreht, jede andere Auswahl eines `select`, Textfelder leer, Zahlen auf `min` und `max`.

Dabei gilt:

- Jede Ausgabe wird gerendert. Hooks direkt in Slot-Funktionen lehnt der Check ab wie l8db.
- Aktionen laufen mit zwei markierten Zeilen und dürfen höchstens 2 s brauchen. `ctx.http` schlägt im Check immer fehl. Fange Fehler in `run` deshalb ab und melde sie mit `ctx.toast`. Den Erfolgsfall prüfst du in l8db selbst: Ziel unter Einstellungen → Erweiterungen → UI-Plugins freigeben, Aktion auslösen, Meldung und `.status.json` ansehen.
- Detail-Tabs werden einmal gerendert, Effekte laufen dabei nicht.
- Fehler meldet der Check mit Optionsvariante, Slot, Tabelle, Zeile und Spalte.
- Die Ausgabe zeigt die Zeit je Zelle nur für `grid.cell`. Ein zu langsamer anderer Slot erscheint als Fehler: `<slot> ist zu langsam: p95 … ms, erlaubt … ms.`

Durch kommt nur, wer diese Bedingungen erfüllt:

- Jeder Slot bleibt im p95 unter der Hälfte seines Budgets in l8db, so bleibt auf langsamen Rechnern Luft:
  - `grid.cell` und `tabs.item`: 2 ms;
  - `grid.rowTone` und `tabs.group`: 1 ms;
  - `split.layout`: 5 ms;
  - die übrigen: 25 ms.
- Jeder Slot mit Funktion muss mit den Beispieldaten in mindestens einer Optionsvariante etwas liefern. `tabs.options`, `split.options` und `split.templates` sind davon ausgenommen. Passt nichts, ergänze in `scripts/samples.ts` passende Tabellen, Spalten oder Tabs, statt das Plugin zu verbiegen.
- Der Screenshot ist byte-genau keine Kopie eines anderen Plugins. Ob er wirklich dein Plugin zeigt, prüft das Review.

## Review

Der Check fängt Versehen ab, aber keine getarnten Zugriffe. Wer einen Pull Request prüft, liest deshalb den Code und lehnt ab, wenn eines davon vorkommt:

- Zugriffe auf `window`, `document` oder Netzwerk über Umwege: berechnete Eigenschaftsnamen wie `["constr" + "uctor"]`, `Reflect`, `Proxy`, Event-Objekte (`event.view`, `event.target.ownerDocument`) oder DOM-Knoten;
- Netzwerk außerhalb von `ctx.http`;
- versteckte Logik wie Base64, `atob` oder lange kodierte Zeichenketten;
- ein Screenshot, der nicht das Plugin zeigt.

Normale Zugriffe wie `row[column.id]`, Texte für die Oberfläche und `event.target.value` in `onChange` sind erlaubt.

## Screenshots

Der Screenshot zeigt das Plugin in der echten App: helles Theme, Fenster 1440×860 bei doppelter Auflösung, also 2880×1720 Pixel. Plugins für die Tab-Leiste dürfen einen Ausschnitt zeigen.

Im l8db-Repo entstehen Screenshots automatisch: erst `bun run build`, dann `bun scripts/ui-plugin-screenshots.ts ../l8db-ui-plugins <id>`. Für ein neues Plugin legst du dort in `SCENES` eine Szene an. Ohne l8db-Repo nimmst du den Screenshot von Hand in l8db auf.

## Veröffentlichen

Ein Push nach `main` startet `.github/workflows/publish.yml`. Der Workflow baut mit `bun run catalog` den Ordner `dist/` und legt ihn als neuen Commit in den Branch `catalog`. l8db liest `https://raw.githubusercontent.com/Leon-Achteresch/l8db-ui-plugins/catalog/catalog.json`. Den Branch `catalog` änderst du nie von Hand.
