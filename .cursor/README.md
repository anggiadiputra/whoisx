# Cursor Rules for Domain Management Web App

This directory contains project-specific cursor rules that guide development patterns, ensure consistency, and capture implementation knowledge.

## Rules Structure

### Core Rules
- **`unified-10x-dev.mdc`** - Main development framework tailored for this domain management project
- **`memory-system.mdc`** - Memory generation protocol for capturing implementation learnings
- **`project-overview.mdc`** - Complete project architecture and requirements reference

### Specialized Rules (Created as needed)
- **`rdap-providers.mdc`** - RDAP provider configurations and quirks
- **`domain-validation.mdc`** - Domain format validation and TLD handling  
- **`caching-strategies.mdc`** - Cache optimization patterns
- **`performance-benchmarks.mdc`** - Performance targets and metrics

## Usage Protocol

### Before Implementation
1. Review `unified-10x-dev.mdc` for current patterns
2. Check `project-overview.mdc` for architecture constraints
3. Consult relevant specialized rules if they exist

### During Implementation  
1. Follow patterns defined in rules
2. Document any deviations or new discoveries
3. Note performance metrics and configuration values

### After Implementation
1. Update `unified-10x-dev.mdc` with new patterns
2. Generate memory using templates from `memory-system.mdc`
3. Create specialized rules for new domains that emerge
4. Update this README if structure changes

## Memory Generation

After each significant implementation, generate a memory following these templates:

### RDAP Integration
```
Successfully integrated [PROVIDER] RDAP endpoint with [FEATURES]. 
Key learnings: [LESSONS]. Performance: [METRICS]. Gotchas: [ISSUES].
```

### Database Optimization
```
Optimized [TABLE/QUERY] for [USE_CASE]. Changes: [MODIFICATIONS]. 
Performance impact: [BEFORE_VS_AFTER]. Migration notes: [DEPLOYMENT_CONSIDERATIONS].
```

### Caching Strategy
```
Implemented [CACHE_TYPE] for [DATA_TYPE] with [TTL_STRATEGY]. 
Hit rate: [PERCENTAGE]. Invalidation: [METHOD]. Memory usage: [METRICS].
```

## Rule Evolution

Rules are living documents that evolve with the project:

- **Successful patterns** → Add to rules as recommended approaches
- **Failed approaches** → Document as anti-patterns to avoid
- **Provider quirks** → Capture in specialized provider rules
- **Performance insights** → Update benchmarks and optimization guides

## Project Context

**Domain Management Web App**
- **Tech Stack**: Next.js 15 + TypeScript + PostgreSQL + Tailwind CSS
- **Key Features**: RDAP integration, domain expiry tracking, role-based access
- **Performance Targets**: 100 domains/10s lookups, 99% uptime, 80% cache hit rate
- **Deployment**: Vercel with managed PostgreSQL and Redis caching

This rules system ensures consistent development patterns and continuous knowledge capture for optimal development velocity.
