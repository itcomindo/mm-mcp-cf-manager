/** Serialize a value for embedding as a JSON literal inside reviewed execute templates. */
export function serializeForExecuteTemplate(value: unknown): string {
  return JSON.stringify(value)
}

function withZoneId(zoneId: string, body: string): string {
  return `async () => {
  const zoneId = ${serializeForExecuteTemplate(zoneId)};
  ${body}
}`
}

function withAccountId(accountId: string, body: string): string {
  return `async () => {
  const accountId = ${serializeForExecuteTemplate(accountId)};
  ${body}
}`
}

function buildZonesQueryLiteral(page: number, perPage: number, accountId?: string): string {
  if (accountId) {
    return `{ page: ${page}, per_page: ${perPage}, "account.id": ${serializeForExecuteTemplate(accountId)} }`
  }
  return `{ page: ${page}, per_page: ${perPage} }`
}

/** Reviewed template — one GET /zones page (main process loops pages). */
export function buildListZonesPageExecuteCode(
  page: number,
  perPage: number,
  accountId?: string,
): string {
  const query = buildZonesQueryLiteral(page, perPage, accountId)
  return `async () => {
  const response = await cloudflare.request({
    method: "GET",
    path: "/zones",
    query: ${query},
  });
  if (!response.success) {
    return {
      ok: false,
      status: response.status,
      errors: response.errors ?? [],
    };
  }
  const batch = Array.isArray(response.result) ? response.result : [];
  return {
    ok: true,
    result: batch.map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
      account: z.account ? { id: z.account.id } : undefined,
      plan: z.plan ? { name: z.plan.name } : undefined,
    })),
    result_info: response.result_info ?? null,
  };
}`
}

/** Reviewed template — one GET /accounts page. */
export function buildListAccountsPageExecuteCode(page: number, perPage: number): string {
  return `async () => {
  const response = await cloudflare.request({
    method: "GET",
    path: "/accounts",
    query: { page: ${page}, per_page: ${perPage} },
  });
  if (!response.success) {
    return {
      ok: false,
      status: response.status,
      errors: response.errors ?? [],
    };
  }
  const batch = Array.isArray(response.result) ? response.result : [];
  return {
    ok: true,
    result: batch.map((a) => ({ id: a.id, name: a.name })),
    result_info: response.result_info ?? null,
  };
}`
}

export function buildZoneOverviewExecuteCode(zoneId: string): string {
  return withZoneId(
    zoneId,
    `const zoneRes = await cloudflare.request({ method: "GET", path: "/zones/" + zoneId });
  if (!zoneRes.success) {
    return { ok: false, status: zoneRes.status, errors: zoneRes.errors ?? [] };
  }
  const devRes = await cloudflare.request({
    method: "GET",
    path: "/zones/" + zoneId + "/settings/development_mode",
  });
  const secRes = await cloudflare.request({
    method: "GET",
    path: "/zones/" + zoneId + "/settings/security_level",
  });
  const sslRes = await cloudflare.request({
    method: "GET",
    path: "/zones/" + zoneId + "/settings/ssl",
  });
  const secValue = secRes.success && secRes.result && secRes.result.value ? secRes.result.value : null;
  return {
    ok: true,
    zone: zoneRes.result,
    developmentMode: devRes.success && devRes.result ? devRes.result.value === "on" : null,
    securityLevel: secValue,
    underAttackMode: secValue === "under_attack",
    sslMode: sslRes.success && sslRes.result ? sslRes.result.value ?? null : null,
    probes: {
      devStatus: devRes.status,
      devSuccess: devRes.success,
      secStatus: secRes.status,
      secSuccess: secRes.success,
      sslStatus: sslRes.status,
      sslSuccess: sslRes.success,
    },
  };`,
  )
}

export function buildListDnsRecordsExecuteCode(zoneId: string): string {
  return withZoneId(
    zoneId,
    `const collected = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await cloudflare.request({
      method: "GET",
      path: "/zones/" + zoneId + "/dns_records",
      query: { page, per_page: 100 },
    });
    if (!response.success) {
      return { ok: false, status: response.status, errors: response.errors ?? [] };
    }
    const batch = Array.isArray(response.result) ? response.result : [];
    collected.push(...batch);
    totalPages = response.result_info?.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return { ok: true, records: collected };`,
  )
}

export function buildPurgeEverythingExecuteCode(zoneId: string): string {
  return withZoneId(
    zoneId,
    `const response = await cloudflare.request({
    method: "POST",
    path: "/zones/" + zoneId + "/purge_cache",
    body: { purge_everything: true },
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, purged: true };`,
  )
}

export function buildSetDevelopmentModeExecuteCode(zoneId: string, enabled: boolean): string {
  const value = serializeForExecuteTemplate(enabled ? 'on' : 'off')
  return withZoneId(
    zoneId,
    `const response = await cloudflare.request({
    method: "PATCH",
    path: "/zones/" + zoneId + "/settings/development_mode",
    body: { value: ${value} },
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, value: response.result?.value ?? ${value} };`,
  )
}

export function buildSetSecurityLevelExecuteCode(zoneId: string, level: string): string {
  const value = serializeForExecuteTemplate(level)
  return withZoneId(
    zoneId,
    `const response = await cloudflare.request({
    method: "PATCH",
    path: "/zones/" + zoneId + "/settings/security_level",
    body: { value: ${value} },
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, value: response.result?.value ?? ${value} };`,
  )
}

export function buildCreateDnsRecordExecuteCode(
  zoneId: string,
  body: Record<string, unknown>,
): string {
  const bodyLiteral = serializeForExecuteTemplate(body)
  return withZoneId(
    zoneId,
    `const body = ${bodyLiteral};
  const response = await cloudflare.request({
    method: "POST",
    path: "/zones/" + zoneId + "/dns_records",
    body,
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, record: response.result };`,
  )
}

export function buildUpdateDnsRecordExecuteCode(
  zoneId: string,
  recordId: string,
  body: Record<string, unknown>,
): string {
  const recordLiteral = serializeForExecuteTemplate(recordId)
  const bodyLiteral = serializeForExecuteTemplate(body)
  return withZoneId(
    zoneId,
    `const recordId = ${recordLiteral};
  const body = ${bodyLiteral};
  const response = await cloudflare.request({
    method: "PATCH",
    path: "/zones/" + zoneId + "/dns_records/" + recordId,
    body,
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, record: response.result };`,
  )
}

export function buildDeleteDnsRecordExecuteCode(zoneId: string, recordId: string): string {
  const recordLiteral = serializeForExecuteTemplate(recordId)
  return withZoneId(
    zoneId,
    `const recordId = ${recordLiteral};
  const response = await cloudflare.request({
    method: "DELETE",
    path: "/zones/" + zoneId + "/dns_records/" + recordId,
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, deleted: true };`,
  )
}

function buildWafRulesMutationExecuteCode(
  zoneId: string,
  mutateFnSource: string,
): string {
  return withZoneId(
    zoneId,
    `const entryRes = await cloudflare.request({
    method: "GET",
    path: "/zones/" + zoneId + "/rulesets/phases/http_request_firewall_custom/entrypoint",
  });
  if (!entryRes.success) {
    return { ok: false, status: entryRes.status, errors: entryRes.errors ?? [] };
  }
  const entry = entryRes.result;
  if (!entry || !entry.id) {
    return { ok: false, status: 404, errors: [{ message: "Custom rules entrypoint not found" }] };
  }
  const rules = Array.isArray(entry.rules) ? [...entry.rules] : [];
  ${mutateFnSource}
  const updateRes = await cloudflare.request({
    method: "PUT",
    path: "/zones/" + zoneId + "/rulesets/" + entry.id,
    body: { rules },
  });
  if (!updateRes.success) {
    return { ok: false, status: updateRes.status, errors: updateRes.errors ?? [] };
  }
  return { ok: true, rules: updateRes.result?.rules ?? rules };`,
  )
}

export function buildSetWafRuleEnabledExecuteCode(
  zoneId: string,
  ruleId: string,
  enabled: boolean,
): string {
  const ruleLiteral = serializeForExecuteTemplate(ruleId)
  const enabledLiteral = enabled ? 'true' : 'false'
  return buildWafRulesMutationExecuteCode(
    zoneId,
    `for (let i = 0; i < rules.length; i += 1) {
    if (rules[i].id === ${ruleLiteral}) {
      rules[i] = { ...rules[i], enabled: ${enabledLiteral} };
      break;
    }
  }`,
  )
}

export function buildDeleteWafRuleExecuteCode(zoneId: string, ruleId: string): string {
  const ruleLiteral = serializeForExecuteTemplate(ruleId)
  return buildWafRulesMutationExecuteCode(
    zoneId,
    `for (let i = rules.length - 1; i >= 0; i -= 1) {
    if (rules[i].id === ${ruleLiteral}) {
      rules.splice(i, 1);
    }
  }`,
  )
}

export function buildUpsertWafRuleExecuteCode(
  zoneId: string,
  input: {
    ruleId?: string
    description: string
    expression: string
    action: string
    enabled: boolean
  },
): string {
  const payload = serializeForExecuteTemplate(input)
  return buildWafRulesMutationExecuteCode(
    zoneId,
    `const payload = ${payload};
  if (payload.ruleId) {
    let found = false;
    for (let i = 0; i < rules.length; i += 1) {
      if (rules[i].id === payload.ruleId) {
        rules[i] = {
          ...rules[i],
          description: payload.description,
          expression: payload.expression,
          action: payload.action,
          enabled: payload.enabled,
        };
        found = true;
        break;
      }
    }
    if (!found) {
      return { ok: false, status: 404, errors: [{ message: "Rule not found" }] };
    }
  } else {
    rules.push({
      description: payload.description,
      expression: payload.expression,
      action: payload.action,
      enabled: payload.enabled,
    });
  }`,
  )
}

export function buildListWafRulesExecuteCode(zoneId: string): string {
  return withZoneId(
    zoneId,
    `const entryRes = await cloudflare.request({
    method: "GET",
    path: "/zones/" + zoneId + "/rulesets/phases/http_request_firewall_custom/entrypoint",
  });
  if (!entryRes.success) {
    return { ok: false, status: entryRes.status, errors: entryRes.errors ?? [] };
  }
  const rules = [];
  const entry = entryRes.result;
  if (entry && Array.isArray(entry.rules)) {
    for (const rule of entry.rules) {
      rules.push(rule);
    }
  }
  return { ok: true, rules };`,
  )
}

export function buildListAccountIpAccessRulesPageExecuteCode(
  accountId: string,
  page: number,
  perPage: number,
  mode?: 'whitelist',
): string {
  const queryParts = [`page: ${page}`, `per_page: ${perPage}`]
  if (mode) {
    queryParts.push(`mode: ${serializeForExecuteTemplate(mode)}`)
  }
  const queryLiteral = `{ ${queryParts.join(', ')} }`
  return withAccountId(
    accountId,
    `const response = await cloudflare.request({
    method: "GET",
    path: "/accounts/" + accountId + "/firewall/access_rules/rules",
    query: ${queryLiteral},
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  const batch = Array.isArray(response.result) ? response.result : [];
  return {
    ok: true,
    result: batch,
    result_info: response.result_info ?? null,
  };`,
  )
}

export function buildCreateAccountIpAccessRuleExecuteCode(
  accountId: string,
  payload: { target: string; value: string; mode: string; notes?: string },
): string {
  const bodyLiteral = serializeForExecuteTemplate({
    configuration: { target: payload.target, value: payload.value.trim() },
    mode: payload.mode,
    notes: payload.notes ?? undefined,
  })
  return withAccountId(
    accountId,
    `const response = await cloudflare.request({
    method: "POST",
    path: "/accounts/" + accountId + "/firewall/access_rules/rules",
    body: ${bodyLiteral},
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, result: response.result ?? null };`,
  )
}

export function buildDeleteAccountIpAccessRuleExecuteCode(
  accountId: string,
  ruleId: string,
): string {
  return withAccountId(
    accountId,
    `const response = await cloudflare.request({
    method: "DELETE",
    path: "/accounts/" + accountId + "/firewall/access_rules/rules/" + ${serializeForExecuteTemplate(ruleId)},
  });
  if (!response.success) {
    return { ok: false, status: response.status, errors: response.errors ?? [] };
  }
  return { ok: true, result: response.result ?? null };`,
  )
}
