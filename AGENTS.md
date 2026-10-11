# AGENTS — MM MCP CF Manager

Spec: [MM-MCP-CF-Manager-Blueprint.md](MM-MCP-CF-Manager-Blueprint.md)

Cursor rules: [.cursor/rules/](.cursor/rules/)

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When working on this app, prefer project skills below. Invoke from repo root:

`npx openskills read <skill-name>`

For multiple: `npx openskills read mm-mcp-blueprint,mm-mcp-implement-phase`

Project skills also live under `.cursor/skills/` for Cursor Agent discovery.
</usage>

<available_skills>

<skill>
<name>mm-mcp-blueprint</name>
<description>Aligns work with MM-MCP-CF-Manager-Blueprint.md. Use when starting a major feature, entering a new implementation phase, resolving spec conflicts, or approaching v1 Definition of Done.</description>
<location>project</location>
</skill>

<skill>
<name>mm-mcp-implement-phase</name>
<description>Implements one blueprint phase (1–7) with exit criteria. Use when the user says Phase N, foundation, MCP connection, task engine, bulk actions, or hardening.</description>
<location>project</location>
</skill>

<skill>
<name>mm-mcp-add-write-action</name>
<description>Adds a reviewed Cloudflare write action end-to-end. Use for new mutations, bulk actions, or extending Cache/Security/WAF/DNS features.</description>
<location>project</location>
</skill>

<skill>
<name>mm-mcp-ipc-surface</name>
<description>Adds a typed preload API and main IPC handler for window.mmcf. Use when exposing new renderer capabilities or extending the contextBridge surface.</description>
<location>project</location>
</skill>

<skill>
<name>mm-mcp-safe-execute</name>
<description>Authors or reviews Cloudflare MCP Code Mode execute templates with safe dynamic value serialization.</description>
<location>project</location>
</skill>

<skill>
<name>mm-mcp-verify-stack</name>
<description>Verifies Node 24+, stable Electron pin, and dependency upgrades against official docs. Use when editing package.json or MCP/Electron integration.</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
