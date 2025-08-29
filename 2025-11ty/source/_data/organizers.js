const fs = require("fs");
const path = require("path");
const parse = require("csv-parse/sync").parse;

module.exports = () => {
  const filePath = path.join(__dirname, "organizers.csv");
  const fileContent = fs.readFileSync(filePath, "utf8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });

  // Group by role while preserving CSV order
  const groups = {};
  records.forEach(record => {
    if (!groups[record.role]) {
      groups[record.role] = [];
    }
    groups[record.role].push(record);
  });

  return groups;
};

