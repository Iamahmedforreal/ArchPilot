# ArchPilot

## Overview

ArchPilot AI is a  system design workspace. Users describe a system in plain English, an AI agent maps that system onto a canvas, user refine the architecture, and the app generates a technical specification from the resulting graph.

## Goals

1. Let authenticated users create and manage architecture projects.
2. Provide a real-time canvas for system design.
3. Let users import prebuilt starter system designs into the canvas.
4. Let AI generate an initial architecture from a natural language prompt.
5. Let users refine the generated architecture.
6. Convert the final graph into a persistent Markdown technical spec.

## Core User Flow
1. User signs in.
2. User creates or selects a project.
3. User enters the project workspace.
4. User optionally imports a starter system design template into the canvas.
5. User prompts the AI to generate or extend the system design.
6. AI generates nodes and edges in the canvas.
7. User edits and refines the design.
8. User triggers spec generation.
9. App persists the generated Markdown spec.
10. User reviews or downloads the spec.

## Features

### Authentication and Projects

- User sign-in and route protection.
- Project creation and ownership.
- Project list and workspace navigation.

### Canvas

- Real-time canvas using React Flow.
- Node/edge editing.
- Canvas snapshots persisted to the filesystem.

### Starter System Designs

- A curated library of prebuilt system design templates.
- Users can import a starter template into the canvas at any point during editing.
- Templates are static canvas snapshots loaded directly into the active canvas.
- Covers common patterns: monolith, microservices, event-driven, serverless, and more.

### AI Architecture Generation

- AI generates a system design from a user-supplied prompt.
- Output is structured as canvas nodes and edges written into the canvas.
- Generation runs as a durable background task.

### Spec Generation

- The current canvas graph is converted into a Markdown technical specification.
- Specs are persisted as files and linked to the project in the database.
- Users can view and download generated specs.

## Scope

### In Scope

- Authentication and route protection
- Project creation and ownership
- Starter system design template library and import
- Real-time canvas with nodes and edges
- AI-powered architecture generation from prompts
- AI-powered Markdown spec generation from the canvas graph
- Persistent storage for project metadata and generated artifacts
- Spec download

### Out Of Scope

- Billing and subscription systems
- Multi-user collaboration and presence
- Enterprise permission tiers
- Versioned spec history and review workflows
- Production object storage migration
- Mobile-native applications

## Success Criteria

1. A signed-in user can create and open a project.
2. A user can import a prebuilt starter design into the canvas.
3. AI can generate an architecture into the canvas from a prompt.
4. The graph can be converted into a persisted Markdown spec.
5. Project metadata and generated artifacts are stored in the correct layers.