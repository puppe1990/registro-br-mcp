# Registro.br MCP Server

Um servidor [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) para consultar o RDAP do Registro.br.

## Ferramentas Disponíveis

| Ferramenta        | Descrição                                                                |
| ----------------- | ------------------------------------------------------------------------ |
| `rdap_domain`     | Consulta informações de domínios .br (ex: `nic.br`, `registro.br`)       |
| `rdap_entity`     | Consulta entidades por CNPJ, CPF ou handle (ex: `05506560000136`, `FAN`) |
| `rdap_nameserver` | Consulta informações de nameservers (ex: `a.dns.br`)                     |
| `rdap_ip`         | Consulta informações de IP ou rede (ex: `200.160.0.0`, `200.160.0.0/20`) |
| `rdap_asn`        | Consulta Autonomous System Numbers (ex: `22548`, `AS22548`)              |

## Instalação

### Via npx (recomendado)

Não é necessário instalar. Configure diretamente no seu cliente MCP.

### Via npm (global)

```bash
npm install -g registro-br-mcp
```

## Configuração

### Claude Desktop

Adicione ao arquivo de configuração:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "registro-br": {
      "command": "npx",
      "args": ["registro-br-mcp"]
    }
  }
}
```

### Claude Code

Adicione ao arquivo:

- **macOS/Linux**: `~/.claude/settings.json`
- **Windows**: `%USERPROFILE%\.claude\settings.json`

```json
{
  "mcpServers": {
    "registro-br": {
      "command": "npx",
      "args": ["registro-br-mcp"]
    }
  }
}
```

### Cursor

Adicione ao arquivo de configuração MCP:

- **macOS/Linux**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "registro-br": {
      "command": "npx",
      "args": ["registro-br-mcp"]
    }
  }
}
```

### Windsurf

Adicione ao arquivo de configuração MCP:

- **macOS/Linux**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

```json
{
  "mcpServers": {
    "registro-br": {
      "command": "npx",
      "args": ["registro-br-mcp"]
    }
  }
}
```

### Antigravity

Adicione ao arquivo de configuração MCP:

- **macOS/Linux**: `~/.antigravity/mcp.json`
- **Windows**: `%USERPROFILE%\.antigravity\mcp.json`

```json
{
  "mcpServers": {
    "registro-br": {
      "command": "npx",
      "args": ["registro-br-mcp"]
    }
  }
}
```

## Exemplos de Uso

Após configurar, você pode fazer perguntas como:

- "Consulte o domínio nic.br"
- "Quem é o registrante do domínio registro.br?"
- "Busque informações do ASN 22548"
- "Qual o IP do nameserver a.dns.br?"
- "Consulte a entidade com CNPJ 05506560000136"

## Exemplo de Resposta

Consulta do domínio `nic.br`:

```
Domain: nic.br
Handle: nic.br
Status: active

Events:
  - registration: 1997-07-11T12:00:00Z
  - last changed: 2018-03-27T20:09:08Z

Nameservers:
  - a.dns.br
  - b.dns.br
  - c.dns.br
  - d.dns.br
  - e.dns.br

DNSSEC: Signed
  - KeyTag: 47828, Algorithm: 13, DigestType: 2

Entities:
  - Núcleo de Inf. e Coord. do Ponto BR - NIC.BR (registrant)
  - Frederico Augusto de Carvalho Neves (technical)
```

## API RDAP

Este servidor utiliza a API RDAP pública do Registro.br:

- Base URL: `https://rdap.registro.br`
- Documentação: https://registro.br/rdap/

## Desenvolvimento

```bash
# Clonar o repositório
git clone https://github.com/yvesmariano/registro-br-mcp.git
cd registro-br-mcp

# Instalar dependências
npm install

# Executar localmente
npm start
```

## Requisitos

- Node.js >= 18.0.0

## Licença

MIT
