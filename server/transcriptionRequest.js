// Retry only temporary transport/provider failures, once. Never retry quota or
// authentication failures. Each attempt gets a fresh bounded timeout.
async function transcriptionRequest(fetchImpl, url, init) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(45000) });
      if (attempt === 0 && [500, 502, 503, 504].includes(response.status)) {
        await response.body?.cancel();
        continue;
      }
      return response;
    } catch (error) {
      const transient = error.name === 'TimeoutError' || error.name === 'TypeError' ||
        ['ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'EAI_AGAIN'].includes(error.cause?.code);
      if (attempt > 0 || !transient) throw error;
    }
  }
}
module.exports = { transcriptionRequest };
