const parseCsvRow = (row = '') => {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        value += character;
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
};

const filenameDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const filenamePart = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const kycExportFilename = (csv, date = new Date()) => {
  const rows = String(csv).split(/\r?\n/).filter((row) => row.trim());
  const headers = parseCsvRow(rows.shift()).map((header) => header.toLowerCase());
  const districtIndex = headers.indexOf('district');
  const districts = new Set(
    districtIndex < 0 ? [] : rows.map((row) => parseCsvRow(row)[districtIndex]).filter(Boolean),
  );
  const district = districts.size === 1 ? filenamePart([...districts][0]) : 'multiple-districts';
  return `kyc-data-${district || 'multiple-districts'}-${filenameDate(date)}.csv`;
};
