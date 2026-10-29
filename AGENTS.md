# AGENTS.md

Dies ist die öffentliche Sammlung von UI-Plugins für l8db. Jedes Plugin liegt in `plugins/<id>/`, und nach dem Merge nach `main` erscheint es in der Galerie von l8db.

## Plugin schreiben

Lies zuerst `sdk/folder-agents.md` (Regeln, Slots, Optionen, Hilfen, Grenzen) und `sdk/l8db-ui.d.ts` (Typen). Die Anleitung ist für den Plugin-Ordner in l8db geschrieben. Im Repo gilt:

- Statt `.status.json` zu lesen, führst du `bun run check` aus.
- Das Grundgerüst verdrahtet `sales.orders` fest. Plugins hier müssen auf fremden Datenbanken laufen, darum findest du Tabellen und Spalten über Optionen oder Namensmuster.

`sdk/` ist eine Kopie aus dem l8db-Repo. Ändere dort nichts von Hand; neue Stände holt `bun run sync-sdk`.

Regeln für ein Plugin:

- Ordnername: `plugins/<herausgeber>.<name>/`. `herausgeber` ist dein GitHub-Name in Kleinbuchstaben.
- Inhalt des Ordners: genau eine Quelldatei `plugin.tsx` (oder `.ts`, `.jsx`, `.js`), ein eigener Screenshot `screenshot.png` (oder `.webp`, `.jpg`, höchstens 2 MB) und optional eine `README.md`.
- Die `id` entspricht dem Ordnernamen. Pflicht sind `name`, `description`, `version` (semver wie `1.0.0`) und `author`.
- Alles, was Personen unterschiedlich haben wollen, wird eine Option mit sinnvollem Standardwert: Spalten, Tabellen, Schwellen und sichtbare Texte.
- Keine Kommentare im Code.

## Prüfen

Führe `bun run readme`, `bun run check` und `bun test scripts` aus; alle drei müssen ohne Fehler durchlaufen. `bun run readme` schreibt die Plugin-Liste in `README.md`, und diese Änderung gehört in den Pull Request.

Der Check übersetzt jedes Plugin mit denselben Regeln wie l8db. Dann ruft er jeden Slot mit den Beispieldaten aus `scripts/samples.ts` und jeder Optionsvariante auf und rendert jede Ausgabe. Fehler meldet er mit Optionsvariante, Slot, Tabelle, Zeile und Spalte. Durch kommt nur, wer diese Bedingungen erfüllt:

- `grid.cell` braucht im p95 unter 2 ms. l8db selbst schaltet erst ab 4 ms ab, so bleibt auf langsamen Rechnern Luft.
- Jeder Slot muss mit den Beispieldaten mindestens einmal etwas liefern. Passt nichts, ergänze in `scripts/samples.ts` passende Tabellen, Spalten oder Tabs, statt das Plugin zu verbiegen.
- Der Screenshot darf keine Kopie eines anderen Plugins sein.

## Screenshots

Der Screenshot zeigt das Plugin in der echten App: helles Theme, Fenster 1440×860 bei doppelter Auflösung, also 2880×1720 Pixel. Plugins für die Tab-Leiste dürfen einen Ausschnitt zeigen.

Im l8db-Repo entstehen Screenshots automatisch: erst `bun run build`, dann `bun scripts/ui-plugin-screenshots.ts ../l8db-ui-plugins <id>`. Für ein neues Plugin legst du dort in `SCENES` eine Szene an. Ohne l8db-Repo nimmst du den Screenshot von Hand in l8db auf.

## Veröffentlichen

Ein Push nach `main` startet `.github/workflows/publish.yml`. Der Workflow baut mit `bun run catalog` den Ordner `dist/` und legt ihn als neuen Commit in den Branch `catalog`. l8db liest `https://raw.githubusercontent.com/Leon-Achteresch/l8db-ui-plugins/catalog/catalog.json`. Den Branch `catalog` änderst du nie von Hand.
