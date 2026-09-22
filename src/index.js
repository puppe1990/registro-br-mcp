#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";

import {
  fetchRdap,
  formatAsnInfo,
  formatDomainInfo,
  formatEntityInfo,
  formatIpInfo,
  formatNameserverInfo,
} from "./rdap.js";

export const TOOLS = [
  {
    name: "rdap_domain",
    description: "Query RDAP information for a .br domain",
    schema: {
      domain: z.string().describe("The domain name to query (e.g., nic.br, registro.br)"),
    },
    path: ({ domain }) => `/domain/${domain}`,
    format: formatDomainInfo,
    errorLabel: "domain",
  },
  {
    name: "rdap_entity",
    description: "Query RDAP information for an entity (by CNPJ, CPF, or handle)",
    schema: {
      entity: z
        .string()
        .describe("The entity identifier (CNPJ without punctuation, CPF, or handle like 'FAN')"),
    },
    path: ({ entity }) => `/entity/${entity}`,
    format: formatEntityInfo,
    errorLabel: "entity",
  },
  {
    name: "rdap_nameserver",
    description: "Query RDAP information for a nameserver",
    schema: {
      nameserver: z.string().describe("The nameserver hostname (e.g., a.dns.br)"),
    },
    path: ({ nameserver }) => `/nameserver/${nameserver}`,
    format: formatNameserverInfo,
    errorLabel: "nameserver",
  },
  {
    name: "rdap_ip",
    description: "Query RDAP information for an IP address or network",
    schema: {
      ip: z
        .string()
        .describe("The IP address or CIDR notation (e.g., 200.160.0.0, 200.160.0.0/20)"),
    },
    path: ({ ip }) => `/ip/${ip}`,
    format: formatIpInfo,
    errorLabel: "IP",
  },
  {
    name: "rdap_asn",
    description: "Query RDAP information for an Autonomous System Number",
    schema: {
      asn: z.string().describe("The AS number (e.g., 22548 or AS22548)"),
    },
    path: ({ asn }) => `/autnum/${asn.replace(/^AS/i, "")}`,
    format: formatAsnInfo,
    errorLabel: "ASN",
  },
];

export function createServer() {
  const server = new McpServer({
    name: "registro-br-rdap",
    version: "1.0.0",
  });

  for (const tool of TOOLS) {
    server.tool(tool.name, tool.description, tool.schema, async (args) => {
      try {
        const data = await fetchRdap(tool.path(args));
        return {
          content: [
            {
              type: "text",
              text: tool.format(data),
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
              text: `Error querying ${tool.errorLabel}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Registro.br RDAP MCP Server running on stdio");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
