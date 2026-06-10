# API Specification

## POST /chat

### Request

```json
{
  "session_id": "abc123",
  "message": "สมัครยังไง"
}
```

### Response

```json
{
  "intent": "register_service",
  "response": "ลูกค้าสามารถสมัครผ่านเว็บไซต์ของบริษัทได้ครับ",
  "type": "answer"
}
```

## Response Types

- answer
- fallback
- guardrail
