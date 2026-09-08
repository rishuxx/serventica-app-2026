# SERVENTICA — Architecture Decision Log (ADR)

## ADR-001: Monorepo Architecture with pnpm & Turborepo
- **Status**: ACCEPTED
- **Context**: Serventica comprises four core applications (`customer`, `partner`, `admin`, `api`) with shared domain contracts and validation logic.
- **Decision**: Use pnpm workspaces with Turborepo for fast caching, strict package boundaries, and zero code duplication.

## ADR-002: Authoritative Backend Pricing & State Machine
- **Status**: ACCEPTED
- **Context**: Mobile clients must never compute final payable prices or arbitrarily transition booking statuses.
- **Decision**: NestJS API enforces pricing calculation and guard matrices on all booking transitions.

## ADR-003: PostGIS Geographic Spatial Modeling
- **Status**: ACCEPTED
- **Context**: Marketplace serviceability and dispatch depend on polygonal city zones and spatial proximity.
- **Decision**: Use PostgreSQL PostGIS extension with `geometry(Polygon, 4326)` for zones and `geometry(Point, 4326)` for coordinates.

## ADR-004: Provisional Design Tokens & Light Theme Primary
- **Status**: ACCEPTED
- **Context**: Visual UX design will be supplied screen-by-screen from design screenshots.
- **Decision**: Keep design tokens provisional in `@serventica/design-system`, adopting Light Theme as default without locking fixed UI layouts prematurely.
