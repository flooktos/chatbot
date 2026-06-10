# FAQ Chatbot Prototype

## Overview

โปรเจกต์นี้เป็น Prototype สำหรับ FAQ Chatbot ที่ออกแบบมาเพื่อช่วยลดภาระงานตอบคำถามซ้ำของเจ้าหน้าที่ โดยระบบจะตอบคำถามจาก Knowledge Base ที่กำหนดไว้เท่านั้น

แนวทางของระบบ:
- Strict FAQ Chatbot
- Intent-based Matching
- Thai Language Support
- Short Conversation Context
- Guardrail & Fallback
- Conversation Logging

---

## Run Locally

Requirements:
- Node.js 22+
- npm

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Run tests:

```bash
npm test
```

---

## API

### POST /chat

Request:

```json
{
  "session_id": "abc123",
  "message": "สมัครยังไง"
}
```

Response:

```json
{
  "intent": "register_service",
  "response": "ลูกค้าสามารถสมัครใช้บริการผ่านเว็บไซต์ของบริษัทได้ครับ",
  "type": "answer",
  "confidence_score": 1
}
```

Response types:
- `answer`
- `fallback`
- `guardrail`

Conversation events are written to `logs/conversations.jsonl` when the server handles chat requests.

---

## Project Goals

- ลดภาระงานตอบคำถามซ้ำของเจ้าหน้าที่
- เพิ่มความรวดเร็วในการตอบคำถามพื้นฐาน
- ควบคุมความถูกต้องของข้อมูล
- เตรียมความพร้อมสำหรับการต่อยอด AI Chatbot ในอนาคต

---

## Included Documents

| File | Description |
|---|---|
| specs/README.md | Spec-driven development index |
| specs/00-product/prd.md | Product Requirement Document |
| specs/00-product/roadmap.md | Future enhancement roadmap |
| specs/10-design/architecture.md | System architecture overview |
| specs/10-design/knowledge-structure.md | Knowledge & intent structure |
| specs/10-design/api-spec.md | API contract |
| specs/20-behavior/prompt-guardrail.md | Prompting & guardrail policy |
| specs/20-behavior/conversation-rules.md | Conversation behavior & rules |
| specs/30-delivery/logging-strategy.md | Conversation logging strategy |
| specs/30-delivery/testing-strategy.md | Testing approach |
| specs/90-reference/glossary.md | Domain glossary |
| README.md | Project overview |

---

## Core Features

- FAQ chatbot
- Intent matching
- Fallback response
- Guardrail for inappropriate language
- Short conversation context
- Logging

---

## Out of Scope

- Open-ended AI chat
- Multi-language support
- Admin portal
- Workflow automation
- Advanced moderation AI
- Live agent integration

---

## Suggested Stack (Optional)

Frontend:
- Vue / React

Backend:
- Node.js / Express
- Python FastAPI

Storage:
- JSON
- SQLite
- PostgreSQL

AI/NLP:
- Lightweight intent matching
- Future semantic search

---

## Future Enhancements

- Admin knowledge management
- Dashboard & analytics
- AI semantic search
- Multi-language
- Live agent handoff
- External system integration
