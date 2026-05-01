#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const { scan, scanRepo, generateReport } = require("../index.js");

const [,, command, target, ...flags] = process.argv;
const jsonFlag = flags.includes("--json");
const reportFlag = flags.includes("--report");

function printResult(result) {
  if (result.safe) {
    console.log(`✅ SAFE — no injection patterns found in: ${result.source}`);
  } else {
    console.log(`\n[VENOM] ⚠️  INJECTION DETECTED in: ${result.source}\n`);
    for (const f of result.findings) {
      console.log(`  Type   : ${f.type}`);
      console.log(`  Match  : "${f.match.substring(0, 80)}"`);
      console.log(`  Offset : ${f.index}\n`);
    }
    console.log("Action: Do NOT proceed. Review the source manually.\n");
    process.exit(1);
  }
}

if (command === "scan" && target) {
  const text = fs.readFileSync(target, "utf8");
  printResult(scan(text, target));

} else if (command === "scan-repo" && target) {
  // Batch-Scan eines ganzen Repos
  console.log(`🔍 Scanning repo: ${target}\n`);
  const results = scanRepo(target);
  const threats = results.filter(r => !r.safe);
  const safe = results.filter(r => r.safe);

  if (jsonFlag) {
    console.log(generateReport(results, "json"));
  } else {
    for (const r of results) printResult(r);
    console.log(`\n📊 Summary: ${safe.length}/${results.length} files clean, ${threats.length} threats found.`);

    if (reportFlag) {
      const reportPath = path.join(target, "venom-report.md");
      fs.writeFileSync(reportPath, generateReport(results, "markdown"));
      console.log(`\n📄 Report saved: ${reportPath}`);
    }
  }

  if (threats.length > 0) process.exit(1);

} else if (command === "check-mcp" && target) {
  const rawUrl = target
    .replace("https://github.com/", "https://raw.githubusercontent.com/")
    .replace(/\/?#.*$/, "")
    .replace(/\/?$/, "/main/README.md");

  console.log(`🔍 Fetching MCP repo: ${target}`);
  https.get(rawUrl, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => printResult(scan(data, target)));
  }).on("error", (e) => {
    console.error("Could not fetch repo:", e.message);
    process.exit(1);
  });

} else if (command === "report" && target) {
  // Standalone Report generieren
  const results = scanRepo(target);
  const format = jsonFlag ? "json" : "markdown";
  const report = generateReport(results, format);
  const ext = jsonFlag ? "json" : "md";
  const reportPath = `venom-report.${ext}`;
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved: ${reportPath}`);
  console.log(report);

} else {
  console.log(`
🛡️  Venom Shield v1.1.0 — Prompt Injection Scanner

Usage:
  venom-shield scan <file>              Scan a single file
  venom-shield scan-repo <dir>          Scan an entire repo (batch)
  venom-shield scan-repo <dir> --report Save markdown report to venom-report.md
  venom-shield scan-repo <dir> --json   Output JSON
  venom-shield check-mcp <github_url>   Scan a GitHub MCP repo README
  venom-shield report <dir>             Generate standalone report

Examples:
  venom-shield scan ./README.md
  venom-shield scan-repo ./ruflo --report
  venom-shield check-mcp https://github.com/author/some-mcp-server
  venom-shield report ./gstack --json
`);
}
