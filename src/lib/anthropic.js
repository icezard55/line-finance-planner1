const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-5';

// Reads a payment slip / receipt photo and extracts amount, date, note, and
// income-or-expense. Always returns a best-effort object — callers must show
// this to the user for confirmation before trusting it, since OCR can be wrong.
async function extractSlipData(imageBase64, mediaType = 'image/jpeg') {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            {
              type: 'text',
              text:
                'อ่านสลิปโอนเงินหรือใบเสร็จในรูปนี้ แล้วตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON ' +
                'รูปแบบ: {"amount": number หรือ null, "occurred_at": "YYYY-MM-DD" หรือ null, "note": string สั้นๆ บอกร้าน/ผู้รับ หรือ null, "type": "income" หรือ "expense"} ' +
                'ถ้าอ่านจำนวนเงินไม่ได้ชัดเจน ให้ amount เป็น null แทนการเดา',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Anthropic API failed: ${res.status} ${detail}`);
  }

  const body = await res.json();
  const raw = (body.content || []).map((c) => c.text || '').join('').trim();
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Could not parse slip extraction response: ${raw}`);
  }

  return {
    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    occurred_at: parsed.occurred_at || null,
    note: parsed.note || null,
    type: parsed.type === 'income' ? 'income' : 'expense',
  };
}

module.exports = { extractSlipData };
