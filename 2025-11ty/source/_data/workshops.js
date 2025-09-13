const fs = require("fs");
const path = require("path");
const parse = require("csv-parse/sync").parse;

const filePath = path.join(__dirname, "workshops.csv");
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

// Normalize descriptions
records.forEach(r => {
  r.workshop_session = r.workshop_session?.trim();
  if (r.workshop_description) {
    r.workshop_description = r.workshop_description
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line)
      .join("<br><br>");
  }
});

// Define a manual order for sessions
const sessionOrder = {
  "Morning": 1,
  "Afternoon": 2,
  "Evening": 3
};

// Sort by date → session → start_time
records.sort((a, b) => {
  if (a.date !== b.date) return a.date.localeCompare(b.date);

  const orderA = sessionOrder[a.workshop_session] || 99;
  const orderB = sessionOrder[b.workshop_session] || 99;
  if (orderA !== orderB) return orderA - orderB;

  return a.start_time.localeCompare(b.start_time);
});

// Group by date+session
const groups = [];
let currentGroup = null;

for (const record of records) {
  const key = `${record.date}__${record.workshop_session}`;
  if (!currentGroup || currentGroup.key !== key) {
    currentGroup = {
      key,
      date: record.date,
      session: record.workshop_session || "Uncategorized",
      workshops: []
    };
    groups.push(currentGroup);
  }
  currentGroup.workshops.push(record);
}

module.exports = groups;