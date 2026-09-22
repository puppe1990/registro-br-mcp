import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RDAP_BASE_URL,
  fetchRdap,
  formatAsnInfo,
  formatDomainInfo,
  formatEntityInfo,
  formatIpInfo,
} from "../src/rdap.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const fixture = (name) => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), "utf8"));

test("formatDomainInfo renders the full domain record", () => {
  assert.equal(
    formatDomainInfo(fixture("domain")),
    [
      "Domain: vivenciasazuis.com.br",
      "Handle: vivenciasazuis.com.br",
      "Status: active",
      "",
      "Events:",
      "  - registration: 2024-03-12T12:00:00Z",
      "  - last changed: 2026-09-21T18:33:00Z",
      "",
      "Nameservers:",
      "  - e.sec.dns.br",
      "  - f.sec.dns.br",
      "",
      "DNSSEC: Signed",
      "  - KeyTag: 47828, Algorithm: 13, DigestType: 2",
      "",
      "Entities:",
      "  - Vivencias Azuis (registrant)",
      "  - Matheus Puppe (administrative, technical)",
    ].join("\n"),
  );
});

test("formatDomainInfo degrades gracefully when optional blocks are missing", () => {
  const output = formatDomainInfo({ handle: "exemplo.com.br", ldhName: "exemplo.com.br" });

  assert.equal(output, "Domain: exemplo.com.br\nHandle: exemplo.com.br\nStatus: N/A");
  assert.doesNotMatch(output, /Nameservers|DNSSEC|Entities/);
});

test("formatDomainInfo falls back to the entity handle and omits unsigned DNSSEC key data", () => {
  const output = formatDomainInfo({
    handle: "exemplo.com.br",
    ldhName: "exemplo.com.br",
    status: ["active", "on hold"],
    secureDNS: { delegationSigned: false },
    entities: [{ handle: "XYZ" }],
  });

  assert.match(output, /^Status: active, on hold$/m);
  assert.match(output, /^DNSSEC: Not signed$/m);
  assert.doesNotMatch(output, /KeyTag/);
  assert.match(output, /^ {2}- XYZ \(N\/A\)$/m);
});

test("formatEntityInfo renders the entity record", () => {
  assert.equal(
    formatEntityInfo(fixture("entity")),
    [
      "Handle: 05506560000136",
      "Name: Núcleo de Inf. e Coord. do Ponto BR - NIC.BR",
      "Type: org",
      "Email: registro@nic.br",
      "Roles: registrant",
      "",
      "Public IDs:",
      "  - CNPJ: 05.506.560/0001-36",
      "",
      "Events:",
      "  - registration: 1997-07-11T12:00:00Z",
      "",
      "Legal Representative: Frederico Augusto de Carvalho Neves",
    ].join("\n"),
  );
});

test("formatEntityInfo skips absent vcard, roles and public ids", () => {
  assert.equal(formatEntityInfo({ handle: "FAN" }), "Handle: FAN");
});

test("formatIpInfo renders the network record", () => {
  const output = formatIpInfo(fixture("ip"));

  assert.match(output, /^Handle: 200\.160\.0\.0\/20$/m);
  assert.match(output, /^Start Address: 200\.160\.0\.0$/m);
  assert.match(output, /^End Address: 200\.160\.15\.255$/m);
  assert.match(output, /^IP Version: v4$/m);
  assert.match(output, /^Name: NICBR-NET-1$/m);
  assert.match(output, /^Type: ALLOCATION$/m);
  assert.match(output, /^Country: BR$/m);
  assert.match(output, /^Status: active$/m);
});

test("formatIpInfo uses N/A for missing optional fields", () => {
  const output = formatIpInfo({
    handle: "10.0.0.0/8",
    startAddress: "10.0.0.0",
    endAddress: "10.255.255.255",
    ipVersion: "v4",
  });

  assert.match(output, /^Name: N\/A$/m);
  assert.match(output, /^Type: N\/A$/m);
  assert.match(output, /^Country: N\/A$/m);
});

test("formatAsnInfo renders the autnum record", () => {
  assert.equal(
    formatAsnInfo(fixture("asn")),
    [
      "Handle: 22548",
      "Start ASN: 22548",
      "End ASN: 22548",
      "Name: Núcleo de Inf. e Coord. do Ponto BR - NIC.BR",
      "Type: DIRECT ALLOCATION",
      "Country: BR",
      "Status: active",
      "",
      "Events:",
      "  - registration: 2002-07-17T12:00:00Z",
    ].join("\n"),
  );
});

test("fetchRdap requests the RDAP endpoint with the right URL and Accept header", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ ldhName: "nic.br" }) };
  };

  const data = await fetchRdap("/domain/nic.br", { fetchImpl });

  assert.deepEqual(data, { ldhName: "nic.br" });
  assert.deepEqual(calls, [
    {
      url: `${RDAP_BASE_URL}/domain/nic.br`,
      options: { headers: { Accept: "application/rdap+json" } },
    },
  ]);
});

test("fetchRdap turns a 404 into a Not found error", async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, statusText: "Not Found" });

  await assert.rejects(() => fetchRdap("/domain/naoexiste.com.br", { fetchImpl }), {
    message: "Not found: /domain/naoexiste.com.br",
  });
});

test("fetchRdap reports the status of any other failure", async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, statusText: "Internal Server Error" });

  await assert.rejects(() => fetchRdap("/autnum/22548", { fetchImpl }), {
    message: "RDAP request failed: 500 Internal Server Error",
  });
});
