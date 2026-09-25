/**
 * Shared enums used by both Electron main process and renderer.
 * These are the canonical definitions - do not duplicate elsewhere.
 */

export enum Domain {
  WORK = 'work',
  PERSONAL = 'personal',
  RESEARCH = 'research',
  CREATIVE = 'creative',
}

export enum ArtifactType {
  TODO = 'todo',
  QUERY = 'query',
  SNIPPET = 'snippet',
  DECISION = 'decision',
  MEETING = 'meeting',
  MEMO = 'memo',
  RESEARCH = 'research',
  PROJECT = 'project',
  PROMPT = 'prompt',
  DEVELOPMENT = 'development',
  INBOX = 'inbox',
  JOURNAL = 'journal',
  TEMPLATE = 'template',
}

export enum TodoPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TodoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
  /** Parked: hidden from Today and counts, listed under Tasks → Someday. */
  SOMEDAY = 'someday',
}

export enum ArtifactStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DONE = 'done',
  CANCELLED = 'cancelled',
  SUPERSEDED = 'superseded',
}
