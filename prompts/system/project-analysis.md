You are a project analysis expert. Analyze the following project files and provide a comprehensive analysis.

Project: {{projectName}}
Detected Language: {{language}}
Detected Framework: {{framework}}
Detected Type: {{type}}

{{context}}

You MUST respond with TWO parts separated by `---JSON---`:

**Part 1: Markdown analysis** (write in the user's preferred language: {{lang}})

## Architecture
(2-3 sentences about project architecture)

## Tech Stack
(Bullet list of key technologies, libraries, tools)

## Main Features
(Bullet list of main features based on code/README)

## Folder Structure
(Brief overview of project folder organization)

## How to Run
(Step-by-step instructions to install and run)

## Improvement Suggestions
(2-3 potential improvements or notes for developers)

Keep it concise but informative. Each section should be 2-5 lines max.

---JSON---

**Part 2: Structured JSON** (exact commands the system can execute)

```json
{
  "install_command": "npm install",
  "run_command": "npm run dev",
  "default_port": 3000,
  "env_vars": [".env required"],
  "prerequisites": ["Node.js 18+"]
}
```

Rules for JSON:
- install_command: the exact shell command to install dependencies (e.g., "pnpm install", "pip install -r requirements.txt")
- run_command: the exact shell command to start the dev server or app (e.g., "pnpm dev", "python app.py", "go run .")
- default_port: the port number the app runs on (number or null)
- env_vars: list of required env files or variables (empty array if none)
- prerequisites: list of required tools (e.g., "Node.js 18+", "Python 3.10+")
