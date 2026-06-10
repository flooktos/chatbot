# Spec-Driven Development

This folder keeps product decisions, system behavior, technical design, and delivery criteria in one predictable place before implementation begins.

## Structure

| Folder | Purpose |
|---|---|
| 00-product | Product goals, requirements, scope, and roadmap |
| 10-design | Architecture, APIs, data shape, and knowledge structure |
| 20-behavior | Conversation rules, prompts, guardrails, and fallback behavior |
| 30-delivery | Logging, testing strategy, release checks, and operational quality |
| 90-reference | Glossary and shared reference material |
| templates | Reusable spec templates for new features or changes |

## Development Flow

1. Start with product intent in `00-product/prd.md`.
2. Define behavior in `20-behavior/`.
3. Confirm technical contracts in `10-design/`.
4. Create an implementation task list from `templates/tasks-template.md`.
5. Validate the work with `30-delivery/testing-strategy.md`.

## Current Specs

| Spec | Location |
|---|---|
| Product requirements | `00-product/prd.md` |
| Roadmap | `00-product/roadmap.md` |
| Architecture | `10-design/architecture.md` |
| API specification | `10-design/api-spec.md` |
| Knowledge structure | `10-design/knowledge-structure.md` |
| Conversation rules | `20-behavior/conversation-rules.md` |
| Prompt and guardrails | `20-behavior/prompt-guardrail.md` |
| Logging strategy | `30-delivery/logging-strategy.md` |
| Testing strategy | `30-delivery/testing-strategy.md` |
| Glossary | `90-reference/glossary.md` |
