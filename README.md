# AI Form Builder

A local-first AI-powered form generator. Describe your form fields, set validation rules, pick a layout — and get a working React component (or standalone HTML file) generated entirely on your machine using [Ollama](https://ollama.com).

No API keys. No cloud. Just your hardware.

---

## How it works

1. You configure your form through a 4-step wizard (fields → validation → layout → review)
2. The app builds a detailed prompt from your config and sends it to Ollama running locally
3. Ollama runs `llama3.2:3b` and returns JSX code
4. The app auto-fixes common model mistakes, renders a live preview in an iframe, and shows the code in a Monaco editor
5. You copy the React JSX or download a standalone HTML file — ready to use

---

## Features

- **4-step wizard** — guided flow with step-by-step validation so you can't get stuck
- **10 field types** — text, email, password, number, date, select, checkbox, file, textarea, tel
- **Validation rules** — required toggle, regex presets, custom regex, min/max for numbers and dates
- **4 layout options** — single column, two column, card sections, multi-step
- **Live preview** — rendered in a sandboxed iframe using React 18 + Tailwind CDN
- **Code viewer** — Monaco editor (same as VS Code) with syntax highlighting
- **React JSX tab** — copy the raw component to drop into any React project
- **Plain HTML tab** — copy or download a self-contained HTML file, works in any browser without a build step
- **AI output repair** — automatically fixes the most common model mistakes before rendering
- **Cancel anytime** — abort a slow generation mid-flight
- **Fully offline** — Ollama runs locally, nothing leaves your machine

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Ollama](https://ollama.com) installed and running
- The `llama3.2:3b` model pulled

---

## Setup & Run

### 1. Install Ollama

Download and install from [https://ollama.com](https://ollama.com), then pull the model:

```bash
ollama pull llama3.2:3b
```

---

### 2. Configure Ollama environment variables (Windows)

By default Ollama unloads the model from memory after 5 minutes of inactivity. Since CPU inference is slow, set the keep-alive to **30 minutes** so the model stays warm between generations.

Open **PowerShell as Administrator** and run:

```powershell
# Keep the model loaded in memory for 30 minutes after the last request
[System.Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "30m", "Machine")

# (Optional) Allow the app to reach Ollama from the browser dev server
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "http://localhost:5173", "Machine")
```

> These are persistent user-level variables — they survive reboots and apply to all terminals you open after setting them.

**Restart your terminal** after running the above so the new variables are picked up.

To verify:

```powershell
[System.Environment]::GetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "Machine")
# should print: 30m

[System.Environment]::GetEnvironmentVariable("OLLAMA_ORIGINS", "Machine")
# should print: http://localhost:5173
```

---

### 3. Start Ollama

```bash
ollama serve
```

You should see:

```
Listening on 127.0.0.1:11434 (version ...)
```

Leave this terminal open. Ollama must be running whenever you use the app.

---

### 4. Clone the repo and install dependencies

```bash
git clone https://github.com/rawsumitt/ai-form-builder.git
cd ai-form-builder
npm install
```

---

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running in production

To build and serve the optimised bundle:

```bash
npm run build
npm run preview
```

The preview server runs on [http://localhost:4173](http://localhost:4173). Ollama still needs to be running on port `11434`.

---

## Usage

### Step 1 — Define your fields

Add as many fields as you need. For each field, pick a name and a type.

- **select** fields require at least 2 comma-separated options (e.g. `Red, Green, Blue`)
- **file** fields let you restrict accepted file types with a preset or a custom value
- **textarea** fields let you set a placeholder

Field names must be unique and non-empty before you can proceed.

### Step 2 — Set validation rules

Configure per-field rules:

| Rule | Applies to |
|---|---|
| Required | all types |
| Regex pattern | text, email, password, textarea, tel |
| Min / Max value | number, date |

Regex presets are available (letters only, digits only, email, phone, URL, length ranges) or write your own. The app validates your regex before letting you proceed.

### Step 3 — Choose a layout

| Layout | Description |
|---|---|
| Single column | One field per row, full width |
| Two column | CSS grid, fields side by side |
| Card sections | Each field wrapped in its own card |
| Multi-step | All fields visible with horizontal dividers |

### Step 4 — Review & Generate

Check your full config summary, then hit **Generate Form**.

Generation runs on your CPU — `llama3.2:3b` typically takes **1–2 minutes** on a standard laptop. You can hit **Cancel** at any time.

---

## Output

Once generated you get two panels:

### Live Preview
A sandboxed iframe that renders the actual form — fully interactive, with working validation on submit.

### Code Editor

Two tabs:

- **⚛ React JSX** — the raw `GeneratedForm` component. Copy it directly into any React + Tailwind project.
- **🌐 Plain HTML** — a self-contained HTML file with React 18, Tailwind CSS, and Babel loaded from CDN. Hit **↓ Download .html** to save it and open it directly in any browser.

---

## Project structure

```
src/
├── pages/
│   └── Home.jsx          # main page — layout, loading state, error banners
├── components/
│   ├── Wizard.jsx         # 4-step form configuration wizard
│   ├── StepIndicator.jsx  # progress indicator shown at the top of the wizard
│   ├── FormPreview.jsx    # sandboxed iframe live preview
│   └── CodeEditor.jsx     # Monaco editor with React/HTML tab toggle + copy/download
├── hooks/
│   └── useOllama.js       # fetch logic, timeout, abort, output repair patches
└── utils/
    ├── buildPrompt.js     # converts wizard config into the LLM prompt
    └── buildHtml.js       # wraps the JSX component in a standalone HTML file
```

---

## How the AI output repair works

The model sometimes generates slightly broken code. `useOllama.js` applies these patches before rendering:

| Problem | Fix |
|---|---|
| No `function GeneratedForm` wrapper | Wraps the raw output in a full component skeleton |
| Uses `errors` / `setErrors` but never declares them | Injects `const [errors, setErrors] = React.useState({})` |
| Builds `newErrors` but forgets `setErrors(newErrors)` | Inserts the missing call before the length check |
| References `handleSubmit` without defining it | Injects a default `handleSubmit` above the return |
| Uses a field variable but forgot its `useState` | Injects the missing hook declaration |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| AI backend | Ollama (local) with `llama3.2:3b` |
| Routing | React Router v7 |

---

## NPM scripts

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # production build into /dist
npm run preview  # serve the production build locally at localhost:4173
npm run lint     # run ESLint
```

---

## Troubleshooting

**"Cannot connect to Ollama"**
Ollama is not running. Run `ollama serve` in a separate terminal.

**"Model not found"**
The model hasn't been pulled yet. Run `ollama pull llama3.2:3b`.

**Generation takes longer than 5 minutes**
The model was unloaded from memory. Make sure `OLLAMA_KEEP_ALIVE` is set to `30m` (see Setup step 2) and restart Ollama after setting the variable.

**Output looks wrong or incomplete**
Hit the **Generate Form** button again. Small models can be inconsistent. Running a second time usually produces a cleaner result.

---

## Limitations

- Generation speed depends entirely on your CPU. Expect 1–2 min on a mid-range laptop.
- Complex forms with many fields may occasionally produce output that needs a manual tweak in the code editor.
- The model runs with `temperature: 0.2` for consistency, but results can vary between runs.
- The plain HTML export uses CDN scripts — it requires an internet connection to load React and Tailwind at runtime.

---

## License

MIT
