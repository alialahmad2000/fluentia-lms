// ─── Claude API Client with retry + cost tracking ────────────────────
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COSTS_FILE = path.join(__dirname, 'output', 'costs.json');

export default class ClaudeClient {
  constructor(config) {
    this.client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    this.model = config.CLAUDE_MODEL;
    this.maxRetries = config.MAX_RETRIES;
    this.retryDelay = config.RETRY_DELAY_MS;
    this.costPerMInput = config.COST_PER_1M_INPUT;
    this.costPerMOutput = config.COST_PER_1M_OUTPUT;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCost = 0;
    this.callCount = 0;

    // Load existing costs
    if (fs.existsSync(COSTS_FILE)) {
      try {
        const existing = JSON.parse(fs.readFileSync(COSTS_FILE, 'utf-8'));
        this.totalInputTokens = existing.total_input_tokens || 0;
        this.totalOutputTokens = existing.total_output_tokens || 0;
        this.totalCost = existing.total_cost_usd || 0;
        this.callCount = existing.total_calls || 0;
      } catch { /* start fresh */ }
    }
  }

  async generate(prompt, { max_tokens = 4096, type = 'unknown', unit_id = null } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens,
          messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0].text;
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;

        // Track costs
        const cost = (inputTokens / 1_000_000) * this.costPerMInput +
                     (outputTokens / 1_000_000) * this.costPerMOutput;
        this.totalInputTokens += inputTokens;
        this.totalOutputTokens += outputTokens;
        this.totalCost += cost;
        this.callCount++;

        // Log to costs file
        this._logCost({ type, unit_id, inputTokens, outputTokens, cost });

        // Parse JSON from response
        const parsed = this._parseJSON(text);
        if (parsed) return parsed;

        // If parsing failed, retry with a corrective prompt
        if (attempt < this.maxRetries) {
          console.log(`    ⚠️  JSON parse failed, retrying (${attempt}/${this.maxRetries})...`);
          const retryResponse = await this.client.messages.create({
            model: this.model,
            max_tokens,
            messages: [
              { role: 'user', content: prompt },
              { role: 'assistant', content: text },
              { role: 'user', content: 'Your previous response was not valid JSON. Please return ONLY valid JSON with no markdown fences, no explanation, no prefix. Just the raw JSON object.' }
            ],
          });

          const retryText = retryResponse.content[0].text;
          const retryInput = retryResponse.usage.input_tokens;
          const retryOutput = retryResponse.usage.output_tokens;
          const retryCost = (retryInput / 1_000_000) * this.costPerMInput +
                            (retryOutput / 1_000_000) * this.costPerMOutput;
          this.totalInputTokens += retryInput;
          this.totalOutputTokens += retryOutput;
          this.totalCost += retryCost;
          this.callCount++;
          this._logCost({ type: `${type}_retry`, unit_id, inputTokens: retryInput, outputTokens: retryOutput, cost: retryCost });

          const retryParsed = this._parseJSON(retryText);
          if (retryParsed) return retryParsed;
        }

        lastError = new Error('Failed to parse JSON from Claude response');
      } catch (err) {
        lastError = err;
        if (err.status === 429) {
          const wait = this.retryDelay * Math.pow(3, attempt);
          console.log(`    ⏳ Rate limited, waiting ${wait / 1000}s...`);
          await this._sleep(wait);
        } else if (err.status === 529 || err.status >= 500) {
          const wait = this.retryDelay * Math.pow(2, attempt);
          console.log(`    ⏳ Server error (${err.status}), waiting ${wait / 1000}s...`);
          await this._sleep(wait);
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  }

  _parseJSON(text) {
    // Strip markdown code fences if present
    let clean = text.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    else if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    clean = clean.trim();

    try {
      return JSON.parse(clean);
    } catch {
      // Try to find JSON object in the text
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch { /* fall through */ }
      }
      return null;
    }
  }

  _logCost({ type, unit_id, inputTokens, outputTokens, cost }) {
    const entry = {
      timestamp: new Date().toISOString(),
      prompt_type: type,
      unit_id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: Math.round(cost * 10000) / 10000,
    };

    let data = { calls: [], total_input_tokens: 0, total_output_tokens: 0, total_cost_usd: 0, total_calls: 0 };
    if (fs.existsSync(COSTS_FILE)) {
      try { data = JSON.parse(fs.readFileSync(COSTS_FILE, 'utf-8')); } catch { /* fresh */ }
    }

    data.calls.push(entry);
    data.total_input_tokens = this.totalInputTokens;
    data.total_output_tokens = this.totalOutputTokens;
    data.total_cost_usd = Math.round(this.totalCost * 10000) / 10000;
    data.total_calls = this.callCount;

    fs.writeFileSync(COSTS_FILE, JSON.stringify(data, null, 2));
  }

  getCostSummary() {
    return {
      totalCalls: this.callCount,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalCostUSD: Math.round(this.totalCost * 10000) / 10000,
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
