import { BadRequestError } from "./errors.js";

type CsvRow = Record<string, string>;

const clean = (value: string) => value.replace(/^\uFEFF/, "").trim();

const parseLine = (line: string, delimiter: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(clean(value));
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new BadRequestError("CSV invalide");
  values.push(clean(value));
  return values;
};

export const parseCsv = (buffer: Buffer, maxRows = 1000): CsvRow[] => {
  if (!buffer?.length || buffer.length > 2 * 1024 * 1024) {
    throw new BadRequestError("Fichier CSV invalide");
  }

  const lines = buffer.toString("utf8").replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim());
  if (lines.length < 2 || lines.length > maxRows + 1) {
    throw new BadRequestError("Fichier CSV invalide");
  }

  const delimiter = (lines[0].includes(";") ? ";" : ",");
  const headers = parseLine(lines[0], delimiter).map((header) => header.toLowerCase());
  if (headers.length === 0 || headers.some((header) => !header)) {
    throw new BadRequestError("En-têtes CSV invalides");
  }
  if (new Set(headers).size !== headers.length) {
    throw new BadRequestError("En-têtes CSV invalides");
  }

  return lines.slice(1).map((line) => {
    const values = parseLine(line, delimiter);
    if (values.length !== headers.length) throw new BadRequestError("CSV invalide");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
};
