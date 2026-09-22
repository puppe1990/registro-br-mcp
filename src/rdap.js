export const RDAP_BASE_URL = "https://rdap.registro.br";

export async function fetchRdap(path, { fetchImpl = fetch } = {}) {
  const url = `${RDAP_BASE_URL}${path}`;
  const response = await fetchImpl(url, {
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

function pushEvents(lines, data) {
  if (data.events) {
    lines.push("\nEvents:");
    for (const event of data.events) {
      lines.push(`  - ${event.eventAction}: ${event.eventDate}`);
    }
  }
}

function pushStatus(lines, data) {
  if (data.status) {
    lines.push(`Status: ${data.status.join(", ")}`);
  }
}

export function formatDomainInfo(data) {
  const lines = [];

  lines.push(`Domain: ${data.ldhName}`);
  lines.push(`Handle: ${data.handle}`);
  lines.push(`Status: ${data.status?.join(", ") || "N/A"}`);

  pushEvents(lines, data);

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
        lines.push(
          `  - KeyTag: ${ds.keyTag}, Algorithm: ${ds.algorithm}, DigestType: ${ds.digestType}`,
        );
      }
    }
  }

  if (data.entities) {
    lines.push("\nEntities:");
    for (const entity of data.entities) {
      const name = entity.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] || entity.handle;
      lines.push(`  - ${name} (${entity.roles?.join(", ") || "N/A"})`);
    }
  }

  return lines.join("\n");
}

export function formatEntityInfo(data) {
  const lines = [];

  lines.push(`Handle: ${data.handle}`);

  if (data.vcardArray) {
    const vcard = data.vcardArray[1];
    const fn = vcard.find((v) => v[0] === "fn")?.[3];
    const email = vcard.find((v) => v[0] === "email")?.[3];
    const kind = vcard.find((v) => v[0] === "kind")?.[3];

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

  pushEvents(lines, data);

  if (data.legalRepresentative) {
    lines.push(`\nLegal Representative: ${data.legalRepresentative}`);
  }

  return lines.join("\n");
}

export function formatNameserverInfo(data) {
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

  pushEvents(lines, data);

  return lines.join("\n");
}

export function formatIpInfo(data) {
  const lines = [];

  lines.push(`Handle: ${data.handle}`);
  lines.push(`Start Address: ${data.startAddress}`);
  lines.push(`End Address: ${data.endAddress}`);
  lines.push(`IP Version: ${data.ipVersion}`);
  lines.push(`Name: ${data.name || "N/A"}`);
  lines.push(`Type: ${data.type || "N/A"}`);
  lines.push(`Country: ${data.country || "N/A"}`);

  pushStatus(lines, data);
  pushEvents(lines, data);

  return lines.join("\n");
}

export function formatAsnInfo(data) {
  const lines = [];

  lines.push(`Handle: ${data.handle}`);
  lines.push(`Start ASN: ${data.startAutnum}`);
  lines.push(`End ASN: ${data.endAutnum}`);
  lines.push(`Name: ${data.name || "N/A"}`);
  lines.push(`Type: ${data.type || "N/A"}`);
  lines.push(`Country: ${data.country || "N/A"}`);

  pushStatus(lines, data);
  pushEvents(lines, data);

  return lines.join("\n");
}
