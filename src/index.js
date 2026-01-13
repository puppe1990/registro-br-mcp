#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const RDAP_BASE_URL = "https://rdap.registro.br";

async function fetchRdap(path) {
  const url = `${RDAP_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/rdap+json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Not found: ${path}`);
    }
    throw new Error(`RDAP request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function formatDomainInfo(data) {
  const lines = [];

  lines.push(`Domain: ${data.ldhName}`);
  lines.push(`Handle: ${data.handle}`);
  lines.push(`Status: ${data.status?.join(", ") || "N/A"}`);

  if (data.events) {
    lines.push("\nEvents:");
    for (const event of data.events) {
      lines.push(`  - ${event.eventAction}: ${event.eventDate}`);
    }
  }

  if (data.nameservers) {
    lines.push("\nNameservers:");
    for (const ns of data.nameservers) {
      lines.push(`  - ${ns.ldhName}`);
    }
  }

  if (data.secureDNS) {
    lines.push(`\nDNSSEC: ${data.secureDNS.delegationSigned ? "Signed" : "Not signed"}`);
    if (data.secureDNS.dsData) {
      for (const ds of data.secureDNS.dsData) {
        lines.push(`  - KeyTag: ${ds.keyTag}, Algorithm: ${ds.algorithm}, DigestType: ${ds.digestType}`);
      }
    }
  }

  if (data.entities) {
    lines.push("\nEntities:");
    for (const entity of data.entities) {
      const name = entity.vcardArray?.[1]?.find(v => v[0] === "fn")?.[3] || entity.handle;
      lines.push(`  - ${name} (${entity.roles?.join(", ") || "N/A"})`);
    }
  }

  return lines.join("\n");
}

function formatEntityInfo(data) {
  const lines = [];

  lines.push(`Handle: ${data.handle}`);

  if (data.vcardArray) {
    const vcard = data.vcardArray[1];
    const fn = vcard.find(v => v[0] === "fn")?.[3];
    const email = vcard.find(v => v[0] === "email")?.[3];
    const kind = vcard.find(v => v[0] === "kind")?.[3];

    if (fn) lines.push(`Name: ${fn}`);
    if (kind) lines.push(`Type: ${kind}`);
    if (email) lines.push(`Email: ${email}`);
  }

  if (data.roles) {
    lines.push(`Roles: ${data.roles.join(", ")}`);
  }

  if (data.publicIds) {
    lines.push("\nPublic IDs:");
    for (const pid of data.publicIds) {
      lines.push(`  - ${pid.type}: ${pid.identifier}`);
    }
  }

  if (data.events) {
    lines.push("\nEvents:");
    for (const event of data.events) {
      lines.push(`  - ${event.eventAction}: ${event.eventDate}`);
    }
  }

  if (data.legalRepresentative) {
    lines.push(`\nLegal Representative: ${data.legalRepresentative}`);
  }

  return lines.join("\n");
}

function formatNameserverInfo(data) {
  const lines = [];

  lines.push(`Nameserver: ${data.ldhName}`);
  lines.push(`Handle: ${data.handle || "N/A"}`);

  if (data.ipAddresses) {
    if (data.ipAddresses.v4) {
      lines.push(`IPv4: ${data.ipAddresses.v4.join(", ")}`);
    }
    if (data.ipAddresses.v6) {
      lines.push(`IPv6: ${data.ipAddresses.v6.join(", ")}`);
    }
  }

  if (data.events) {
    lines.push("\nEvents:");
    for (const event of data.events) {
      lines.push(`  - ${event.eventAction}: ${event.eventDate}`);
    }
  }

  return lines.join("\n");
}

function formatIpInfo(data) {
  const lines = [];

  lines.push(`Handle: ${data.handle}`);
  lines.push(`Start Address: ${data.startAddress}`);
  lines.push(`End Address: ${data.endAddress}`);
  lines.push(`IP Version: ${data.ipVersion}`);
  lines.push(`Name: ${data.name || "N/A"}`);
  lines.push(`Type: ${data.type || "N/A"}`);
  lines.push(`Country: ${data.country || "N/A"}`);

  if (data.status) {
    lines.push(`Status: ${data.status.join(", ")}`);
  }

  if (data.events) {
    lines.push("\nEvents:");
    for (const event of data.events) {
      lines.push(`  - ${event.eventAction}: ${event.eventDate}`);
    }
  }

  return lines.join("\n");
}

function formatAsnInfo(data) {
  const lines = [];

  lines.push(`Handle: ${data.handle}`);
  lines.push(`Start ASN: ${data.startAutnum}`);
  lines.push(`End ASN: ${data.endAutnum}`);
  lines.push(`Name: ${data.name || "N/A"}`);
  lines.push(`Type: ${data.type || "N/A"}`);
  lines.push(`Country: ${data.country || "N/A"}`);

  if (data.status) {
    lines.push(`Status: ${data.status.join(", ")}`);
  }

  if (data.events) {
    lines.push("\nEvents:");
    for (const event of data.events) {
      lines.push(`  - ${event.eventAction}: ${event.eventDate}`);
    }
  }

  return lines.join("\n");
}

const server = new McpServer({
  name: "registro-br-rdap",
  version: "1.0.0",
});

// Tool: Query domain information
server.tool(
  "rdap_domain",
  "Query RDAP information for a .br domain",
  {
    domain: z.string().describe("The domain name to query (e.g., nic.br, registro.br)"),
  },
  async ({ domain }) => {
    try {
      const data = await fetchRdap(`/domain/${domain}`);
      return {
        content: [
          {
            type: "text",
            text: formatDomainInfo(data),
          },
          {
            type: "text",
            text: "\n\n--- Raw JSON ---\n" + JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying domain: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Query entity information
server.tool(
  "rdap_entity",
  "Query RDAP information for an entity (by CNPJ, CPF, or handle)",
  {
    entity: z.string().describe("The entity identifier (CNPJ without punctuation, CPF, or handle like 'FAN')"),
  },
  async ({ entity }) => {
    try {
      const data = await fetchRdap(`/entity/${entity}`);
      return {
        content: [
          {
            type: "text",
            text: formatEntityInfo(data),
          },
          {
            type: "text",
            text: "\n\n--- Raw JSON ---\n" + JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying entity: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Query nameserver information
server.tool(
  "rdap_nameserver",
  "Query RDAP information for a nameserver",
  {
    nameserver: z.string().describe("The nameserver hostname (e.g., a.dns.br)"),
  },
  async ({ nameserver }) => {
    try {
      const data = await fetchRdap(`/nameserver/${nameserver}`);
      return {
        content: [
          {
            type: "text",
            text: formatNameserverInfo(data),
          },
          {
            type: "text",
            text: "\n\n--- Raw JSON ---\n" + JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying nameserver: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Query IP network information
server.tool(
  "rdap_ip",
  "Query RDAP information for an IP address or network",
  {
    ip: z.string().describe("The IP address or CIDR notation (e.g., 200.160.0.0, 200.160.0.0/20)"),
  },
  async ({ ip }) => {
    try {
      const data = await fetchRdap(`/ip/${ip}`);
      return {
        content: [
          {
            type: "text",
            text: formatIpInfo(data),
          },
          {
            type: "text",
            text: "\n\n--- Raw JSON ---\n" + JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying IP: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Query ASN information
server.tool(
  "rdap_asn",
  "Query RDAP information for an Autonomous System Number",
  {
    asn: z.string().describe("The AS number (e.g., 22548 or AS22548)"),
  },
  async ({ asn }) => {
    try {
      const asnNumber = asn.replace(/^AS/i, "");
      const data = await fetchRdap(`/autnum/${asnNumber}`);
      return {
        content: [
          {
            type: "text",
            text: formatAsnInfo(data),
          },
          {
            type: "text",
            text: "\n\n--- Raw JSON ---\n" + JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error querying ASN: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Registro.br RDAP MCP Server running on stdio");
}

main().catch(console.error);
