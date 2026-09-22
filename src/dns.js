import { Resolver } from "node:dns/promises";

export const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "NS", "MX", "TXT"];
export const DEFAULT_DNS_TYPE = "A";

const RECORD_LOOKUPS = {
  A: "resolve4",
  AAAA: "resolve6",
  CNAME: "resolveCname",
  NS: "resolveNs",
  MX: "resolveMx",
  TXT: "resolveTxt",
};

const defaultResolver = new Resolver();

function formatRecord(recordType, record) {
  if (recordType === "MX") {
    return `${record.priority} ${record.exchange}`;
  }

  if (Array.isArray(record)) {
    return record.join(" ");
  }

  return record;
}

export async function resolveDns(
  name,
  type = DEFAULT_DNS_TYPE,
  { resolver = defaultResolver } = {},
) {
  const recordType = String(type).trim().toUpperCase();
  const lookup = RECORD_LOOKUPS[recordType];

  if (!lookup) {
    throw new Error(
      `Unsupported record type: ${recordType} (expected ${DNS_RECORD_TYPES.join(", ")})`,
    );
  }

  let records;

  try {
    records = await resolver[lookup](name);
  } catch (error) {
    if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
      throw new Error(`Not found: no ${recordType} records for ${name}`, { cause: error });
    }

    throw new Error(`DNS lookup failed: ${error.code ?? error.message}`, { cause: error });
  }

  const lines = [`Name: ${name}`, `Type: ${recordType}`, "", "Records:"];

  for (const record of records) {
    lines.push(`  - ${formatRecord(recordType, record)}`);
  }

  return lines.join("\n");
}
