import assert from 'node:assert/strict';
// Receiving-only admission. Linux Namespace evidence is the currently verified scope.
const required = ['PID namespaces', 'Network namespaces', 'Seccomp-BPF sandbox'];
export function assessBrowserSandboxEvidence(evidence) {
  const reasons = [], rows = new Map();
  const raw = evidence.sandboxPage || '';
  for (const line of raw.split(/\r?\n/)) {
    const parts = line.split('\t');
    if (parts.length === 2) {
      const key = parts[0].trim(), value = parts[1].trim();
      if (rows.has(key)) reasons.push('Duplicate sandbox row: ' + key);
      rows.set(key, value);
    }
  }
  if (evidence.platform !== 'linux') reasons.push('Platform has no verified admission policy');
  if (rows.get('Layer 1 Sandbox') !== 'Namespace') reasons.push('Layer 1 Namespace sandbox not established');
  for (const key of required) if (rows.get(key) !== 'Yes') reasons.push(key + ' is not explicitly Yes');
  if (!/^You are adequately sandboxed\.$/m.test(raw) || /NOT adequately sandboxed/i.test(raw)) reasons.push('Adequate sandbox status missing or contradictory');
  const identity = evidence.identity || {};
  if (!identity.executable_path?.trim().startsWith('/')) reasons.push('Actual executable identity missing');
  if (!identity.version?.trim()) reasons.push('Actual browser version missing');
  if (!identity.command_line?.trim()) reasons.push('Actual command line missing');
  if (!evidence.versionPage?.trim()) reasons.push('Raw version observation missing');
  const command = identity.command_line || '';
  const profile = identity.profile_path?.trim() || '';
  const match = command.match(/(?:^|\s)--user-data-dir=(\/tmp\/playwright_chromiumdev_profile-[A-Za-z0-9_-]+)(?=\s|$)/g) || [];
  if (match.length !== 1) reasons.push('Unique owned ephemeral Playwright user-data directory not established');
  const parent = match.length === 1 ? match[0].trim().slice('--user-data-dir='.length) : null;
  if (!parent || profile !== parent + '/Default') reasons.push('Actual profile does not match owned ephemeral user-data directory');
  if (!/(?:^|\s)--remote-debugging-pipe(?=\s|$)/.test(command) || /(?:^|\s)--remote-debugging-port(?:=|\s|$)/.test(command)) reasons.push('Exclusive pipe debugging ownership not established');
  if ((command.match(/(?:^|\s)--user-data-dir(?:=|\s|$)/g) || []).length !== 1) reasons.push('Ambiguous user-data directory arguments');
  if (/(?:^|\s|["'])--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox|disable-seccomp-filter-sandbox|disable-gpu-sandbox|no-zygote-sandbox|single-process)(?=$|[\s="'])/.test(command)) reasons.push('Actual command line disables sandbox isolation');
  if ((evidence.errors || []).length) reasons.push('Probe observation or cleanup failed');
  return {status: reasons.length ? 'unverified' : 'qualified', reasons, rows: Object.fromEntries(rows)};
}

export async function collectBrowserSandboxEvidence(browser, {requestedExecutable, platform = process.platform} = {}) {
  const evidence = {platform, requestedExecutable: requestedExecutable ?? null, sandboxPage: null, versionPage: null, identity: {}, errors: []};
  let context;
  try {
    context = await browser.newContext();
    const page = await context.newPage();
    for (const [url, field] of [['chrome://sandbox', 'sandboxPage'], ['chrome://version', 'versionPage']]) {
      try {
        await page.goto(url, {timeout: 10000});
        evidence[field] = await page.locator('body').innerText({timeout: 10000});
        if (field === 'versionPage') evidence.identity = await page.evaluate(() => Object.fromEntries(
          ['command_line', 'executable_path', 'profile_path', 'version'].map(id => [id, document.getElementById(id)?.textContent?.trim() || ''])));
      } catch (error) { evidence.errors.push({stage: field, message: String(error)}); }
    }
  } catch (error) { evidence.errors.push({stage: 'context', message: String(error)}); }
  finally {
    if (context) try { await context.close(); } catch (error) { evidence.errors.push({stage: 'cleanup', message: String(error)}); }
  }
  return {...evidence, ...assessBrowserSandboxEvidence(evidence)};
}

// Save failure evidence before rejecting admission; callers navigate only after this resolves.
export async function requireBrowserSandbox(browser, {receipt, saveReceipt, ...options}) {
  receipt.sandbox = await collectBrowserSandboxEvidence(browser, options);
  await saveReceipt();
  assert.equal(receipt.sandbox.status, 'qualified', JSON.stringify(receipt.sandbox.reasons));
  return receipt.sandbox;
}
