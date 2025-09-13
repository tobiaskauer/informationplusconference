const fs = require("fs");
const path = require("path");
const parse = require("csv-parse/sync").parse;

const filePath = path.join(__dirname, "program.csv");
let fileContent = fs.readFileSync(filePath, "utf8");

// Strip BOM if present
fileContent = fileContent.replace(/^\uFEFF/, "");

// Parse CSV
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true
});

// Group by event_type (preserving CSV order)
const groups = [];
const seen = new Map();

records.forEach(record => {
  const type = record.event_type || "Uncategorized";

  if (!seen.has(type)) {
    const group = { type, presentations: [] };
    seen.set(type, group);
    groups.push(group);
  }
  seen.get(type).presentations.push(record);
});

module.exports = groups;