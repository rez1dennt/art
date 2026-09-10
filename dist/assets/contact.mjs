export async function submitContact(payload, { endpoint, timeoutMs = 15000, fetchImpl = globalThis.fetch } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Contact request rejected');
    const result = await response.json();
    if (result?.success !== true) throw new Error('Contact request not confirmed');
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
