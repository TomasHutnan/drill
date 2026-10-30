# Drill

A static test drill website in plain HTML, CSS and JavaScript. There is no build step and no runtime dependency, and all progress stays in the browser's `localStorage`.

## Running

The site uses ES modules and `fetch`, so it must be served over HTTP rather than opened as a file.

```sh
mise run dev    # http://localhost:3000
mise run test   # unit tests
```

## Deployment

The site is served by GitHub Pages from the root of `main` at https://drill.hutnan.dev. The `CNAME` file holds the custom domain, and `.nojekyll` turns off Jekyll processing.

1. Add a DNS record `drill CNAME tomashutnan.github.io`. In Cloudflare, set it to "DNS only".
2. In the repository, open Settings → Pages, deploy from the `main` branch and `/ (root)`, and set the custom domain to `drill.hutnan.dev`.
3. Turn on "Enforce HTTPS" once GitHub has issued the certificate.

## Adding a question set

1. Add a text file to `sets/`.
2. Add its filename to `sets/index.json`.

## Question format

```text
title: My question set

# Optional default settings, before the first question:
mode: answer
penalty: 0.5

# Lines starting with # are comments.
[single] What is the capital of Slovakia?
- Prague
* Bratislava
- Vienna
> Optional explanation shown after answering.

[multi] Which of these are EU members?
* Slovakia
* Czechia
- Norway

[order] Sort from the smallest to the largest:
- Mouse
- Dog
- Elephant
```

- `[single]` needs exactly one answer marked `*`; `[multi]` needs at least one.
- `[order]` lists its items with `-` in the correct order. They are always shuffled when shown.
- Question text may continue on the following lines, up to the first answer.
- Editing a question makes it a new question, so its previous statistics no longer apply to it.

### Settings

Before the first question a file may preset any of these. They only pre-fill the options form: people can still change them, and each set then remembers the last values used.

| Setting | Values |
| --- | --- |
| `time` | seconds per question, `0` for no limit |
| `count` | number of questions, `0` for all |
| `feedback` | `end` or `immediate` |
| `shuffleQuestions`, `shuffleAnswers` | `yes` or `no` |
| `mode` | `question` (all or nothing) or `answer` (per answer) |
| `points` | points for a correct question or answer |
| `penalty` | points lost for a wrong question or answer |
| `floor` | `yes` to stop a question scoring below zero |

With `mode: answer`, an incomplete question counts as partly correct when at least one answer is right and its sum before `floor` is not negative. Otherwise it counts as wrong.

## Adding a language

1. Copy `locales/en.json` to `locales/<code>.json` and translate it. Missing keys fall back to English.
2. Add the language to `LANGS` in `js/i18n.js`.

## Project layout

| Path | Purpose |
| --- | --- |
| `js/parser.js` | Question format parser |
| `js/grading.js` | Scoring and per-question statistics |
| `js/session.js` | Quiz session creation and completion |
| `js/export.js` | Statistics tables and file formats |
| `js/sets.js` | Built-in and imported sets |
| `js/store.js` | `localStorage` access |
| `js/i18n.js` | Translations |
| `js/dom.js` | DOM helpers |
| `js/app.js` | Navbar and routing |
| `js/views/` | One module per page |
