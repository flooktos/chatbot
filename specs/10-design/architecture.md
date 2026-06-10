# Architecture Overview

## Core Flow

User Message
-> Guardrail Check
-> Intent Matching
-> Context Resolution
-> Response Generator
-> Logging

## Design Principles

- Strict FAQ Only
- No Open-ended AI Response
- Controlled Template Response
- Lightweight Intent Matching
- Thai Language Support

## Context Strategy

- Store last matched intent
- Reuse previous intent for follow-up questions
- Fallback does not immediately reset context
