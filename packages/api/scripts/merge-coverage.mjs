import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import libCoverage from "istanbul-lib-coverage";

const chunksDirectory = resolve(process.argv[2] || ".tmp/cov");

const map = libCoverage.createCoverageMap({});

for (const chunk of readdirSync(chunksDirectory)) {
  const file = join(chunksDirectory, chunk, "coverage-final.json");
  if (!existsSync(file)) continue;
  map.merge(JSON.parse(readFileSync(file, "utf8")));
}

const totals = {
  statements: { covered: 0, total: 0 },
  branches: { covered: 0, total: 0 },
  functions: { covered: 0, total: 0 },
  lines: { covered: 0, total: 0 },
};

const gaps = [];

for (const file of map.files()) {
  const summary = map.fileCoverageFor(file).toSummary();

  for (const metric of Object.keys(totals)) {
    totals[metric].covered += summary[metric].covered;
    totals[metric].total += summary[metric].total;
  }

  if (summary.statements.pct < 100 || summary.branches.pct < 100 || summary.functions.pct < 100)
    gaps.push({ file: file.replace(`${process.cwd()}/`, ""), summary });
}

const percentage = ({ covered, total }) =>
  total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2));

for (const [metric, value] of Object.entries(totals))
  console.log(`${metric.padEnd(11)}: ${percentage(value)}% (${value.covered}/${value.total})`);

console.log(`\nfiles below 100%: ${gaps.length}\n`);

for (const { file, summary } of gaps.sort((a, b) => a.file.localeCompare(b.file)))
  console.log(
    `${file}\n  statements ${summary.statements.covered}/${summary.statements.total}` +
      ` | branches ${summary.branches.covered}/${summary.branches.total}` +
      ` | functions ${summary.functions.covered}/${summary.functions.total}`,
  );
