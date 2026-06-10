# Testing Strategy

## Intent Matching Test

- คำถามใกล้เคียงต้อง match intent เดียวกัน
- response ต้องถูกต้อง

## Context Test

- follow-up question ต้องใช้ context ได้
- fallback ต้องไม่ reset context ทันที

## Guardrail Test

- คำหยาบพื้นฐานต้องถูก block
- ต้องตอบ guardrail response

## Logging Test

- conversation event ต้องถูกบันทึก
