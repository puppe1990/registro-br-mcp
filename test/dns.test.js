import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_DNS_TYPE, DNS_RECORD_TYPES, resolveDns } from "../src/dns.js";

function dnsError(code) {
  return Object.assign(new Error(code), { code });
}

function resolverReturning(records, method) {
  return {
    [method]: async () => records,
  };
}

test("resolveDns defaults to A records", async () => {
  assert.equal(DEFAULT_DNS_TYPE, "A");
  assert.deepEqual(DNS_RECORD_TYPES, ["A", "AAAA", "CNAME", "NS", "MX", "TXT"]);

  const output = await resolveDns("vivenciasazuis.com.br", undefined, {
    resolver: resolverReturning(["167.233.201.9", "3.174.83.69"], "resolve4"),
  });

  assert.equal(
    output,
    [
      "Name: vivenciasazuis.com.br",
      "Type: A",
      "",
      "Records:",
      "  - 167.233.201.9",
      "  - 3.174.83.69",
    ].join("\n"),
  );
});

test("resolveDns normalizes the record type and picks the matching lookup", async () => {
  const calls = [];
  const resolver = {
    resolve6: async (name) => {
      calls.push(name);
      return ["2a01:4f8:c015:314::1"];
    },
  };

  const output = await resolveDns("vivenciasazuis.com.br", "aaaa", { resolver });

  assert.deepEqual(calls, ["vivenciasazuis.com.br"]);
  assert.match(output, /^Type: AAAA$/m);
  assert.match(output, /^ {2}- 2a01:4f8:c015:314::1$/m);
});

test("resolveDns formats MX records with their priority", async () => {
  const output = await resolveDns("gestaobem.com", "MX", {
    resolver: resolverReturning(
      [
        { priority: 10, exchange: "mx1.hostinger.com" },
        { priority: 20, exchange: "mx2.hostinger.com" },
      ],
      "resolveMx",
    ),
  });

  assert.match(output, /^ {2}- 10 mx1\.hostinger\.com$/m);
  assert.match(output, /^ {2}- 20 mx2\.hostinger\.com$/m);
});

test("resolveDns joins multi-chunk TXT records", async () => {
  const output = await resolveDns("vivenciasazuis.com.br", "TXT", {
    resolver: resolverReturning(
      [["v=spf1", "-all"], ["google-site-verification=abc"]],
      "resolveTxt",
    ),
  });

  assert.match(output, /^ {2}- v=spf1 -all$/m);
  assert.match(output, /^ {2}- google-site-verification=abc$/m);
});

test("resolveDns renders NS and CNAME records", async () => {
  const ns = await resolveDns("vivenciasazuis.com.br", "NS", {
    resolver: resolverReturning(["e.sec.dns.br", "f.sec.dns.br"], "resolveNs"),
  });

  assert.match(ns, /^Type: NS$/m);
  assert.match(ns, /^ {2}- e\.sec\.dns\.br$/m);

  const cname = await resolveDns("www.vivenciasazuis.com.br", "CNAME", {
    resolver: resolverReturning(["vivenciasazuis.com.br"], "resolveCname"),
  });

  assert.match(cname, /^Type: CNAME$/m);
  assert.match(cname, /^ {2}- vivenciasazuis\.com\.br$/m);
});

test("resolveDns rejects unsupported record types before hitting the resolver", async () => {
  let touched = false;
  const resolver = {
    resolve4: async () => {
      touched = true;
      return [];
    },
  };

  await assert.rejects(() => resolveDns("vivenciasazuis.com.br", "SRV", { resolver }), {
    message: "Unsupported record type: SRV (expected A, AAAA, CNAME, NS, MX, TXT)",
  });
  assert.equal(touched, false);
});

test("resolveDns reports missing records as Not found", async () => {
  for (const code of ["ENOTFOUND", "ENODATA"]) {
    const resolver = {
      resolve4: async () => {
        throw dnsError(code);
      },
    };

    await assert.rejects(() => resolveDns("naoexiste.com.br", "A", { resolver }), {
      message: "Not found: no A records for naoexiste.com.br",
    });
  }
});

test("resolveDns surfaces other DNS failures with their code", async () => {
  const failing = (error) => ({ resolve4: async () => Promise.reject(error) });

  await assert.rejects(
    () => resolveDns("vivenciasazuis.com.br", "A", { resolver: failing(dnsError("ETIMEOUT")) }),
    {
      message: "DNS lookup failed: ETIMEOUT",
    },
  );

  await assert.rejects(
    () => resolveDns("vivenciasazuis.com.br", "A", { resolver: failing(new Error("boom")) }),
    { message: "DNS lookup failed: boom" },
  );
});
