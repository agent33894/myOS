# Project domain glossary

This glossary defines the product language for myOS projects. Use these terms in UI copy, schemas, tests, and implementation documents.

## Project

A durable source of truth for a related body of work. A project owns its intent, desired outcomes, and rationale, then gathers linked artifacts produced while the work develops.

A project is not a task, folder, or code repository. It may relate to all three.

## Project name

The human-readable title that identifies a project. This is the only project-specific value required from the user during creation.

Use **Project name** in form copy. Avoid mixing **title** and **name** in the UI; `title` may remain the storage field.

## Domain

The broad area of life in which an artifact belongs: Work, Personal, Research, or Creative. Domain controls artifact storage and organization. It does not change project behavior or provide a project template.

Domain is not a project type.

## Project type

Not currently part of the Chronicle project model. Every object created by the project creator has artifact type `project`. Do not label the domain picker as project type.

## Project brief

The project's durable statement of intent, outcomes, and rationale. The brief lives directly on the project artifact and remains editable in the project workspace.

## Intent

The change the project seeks to make or the condition it seeks to make true. Intent describes direction and scope, not a checklist of work.

## Outcome

An observable result that would indicate the project succeeded. Outcomes describe what becomes true, not the implementation steps used to get there.

## Rationale

Why the project is worth doing, why the chosen direction makes sense, and why the work matters now.

## Artifact

A durable knowledge object in Chronicle, such as a todo, memo, decision, research note, prompt, or project.

## Linked artifact

An artifact associated with a project through project metadata or an explicit relationship. Linked artifacts remain independently addressable and appear in the project workspace.

## Decision

A durable artifact recording a choice and its rationale. Decisions link to a project; they do not live as an accumulating prose section inside the project brief.

## Material

Current UI grouping for non-task artifacts linked to a project. Examples include memos, decisions, and research. This is a presentation term, not a distinct artifact type.

## Milestone

A meaningful checkpoint within a project. A project may eventually have multiple milestones, but it does not have one project-level due date. Milestone behavior and storage remain undefined until a separate design decision establishes them.

## Creation panel

The compact, sidebar-anchored surface used to create a project from its name and domain. It is a quick command, not a modal setup workflow.

## Project workspace

The post-creation surface where the user writes the project brief, reviews tasks and materials, opens linked artifacts, and manages project properties.

## Legacy project due date

A `due` value already stored on an existing project under the former task-like model. Chronicle preserves this data for compatibility but does not display or write it. It is not a supported project concept.
