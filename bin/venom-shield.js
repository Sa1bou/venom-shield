#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const { scan } = require("../index.js");

const [,, command, target] = process.argv;

function printResult(result) {
  if (result.safe) {
    console.log(`✅ SAFE — no injection patterns found in: ${result.source}`);
  } else {
    console.log(`\n[VENOM] ⚠️  INJECTION DETECTED in: ${result.source}\n`);
    for (const f of result.findings) {
      console.log(`  Type   : ${f.type}`);
      console.log(`  Match  : "${f.match}"`);
      console.log(`  Offset : ${f.index}\n`);
    }
    console.log("Action: Do NOT proceed. Review the source manually.\n");
    process.exit(1);
  }
}

if (command === "scan" && target) {
  const text = fs.readFileSync(target, "utf8");
  printResult(scan(text, target));

} else if (command === "check-mcp" && target) {
  const rawUrl = target
    .replace("https://github.com/", "https://raw.githubusercontent.com/")
    .replace(/\/?$/, "/main/README.md");
  https.get(rawUrl, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => printResult(scan(data, target)));
  }).on("error", (e) => {
    console.error("Could not fetch repo:", e.message);
    process.exit(1);
  });

} else {
  console.log(`
🛡️  Venom Shield — Prompt Injection Scanner

Usage:
  venom-shield scan <file>             Scan a local file
  venom-shield check-mcp <github_url>  Scan a GitHub MCP repo README

Examples:
  venom-shield scan ./README.md
  venom-shield check-mcp https://github.com/author/some-mcp-server
`);
}
