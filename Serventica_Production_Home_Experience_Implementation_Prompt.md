# SERVENTICA --- PRODUCTION-GRADE HOME EXPERIENCE TRANSFORMATION

## Persistent Category Context • Dynamic Hero • Real Catalog • Adaptive Themes • Supabase • Reanimated

> **Status:** Implementation specification\
> **Target:** Existing Serventica React Native Android application\
> **Architecture:** React Native + TypeScript + Supabase + Reanimated\
> **Purpose:** Transform the current category-navigation behavior into a
> single persistent, production-grade commerce Home experience.

------------------------------------------------------------------------

# 0. NON-NEGOTIABLE INSTRUCTION

This is a **real production/business application**, not a demo or
college project.

Do not implement a superficial visual mock.

Implement the actual architecture, database relationships, state
management, data fetching, caching, animations, loading/error states,
security, accessibility, and navigation behavior required for a
production application.

## Existing functionality that MUST NOT regress

Preserve the working behavior and visual direction already established:

-   Serventica branding
-   20-minute service messaging
-   location display and location interaction
-   location truncation until interaction where already implemented
-   real search
-   database-driven categories
-   horizontal category rail
-   sticky category rail during Home scrolling
-   optimized Hero image delivery
-   Supabase Storage/CDN image architecture
-   Hero dominant-color/adaptive-gradient system
-   lower Hero image
-   existing bottom navigation
-   existing typography unless a change is required for consistency
-   thin modern icon system
-   clean rounded UI
-   responsive Android layout

## Explicitly forbidden

-   Do NOT add a `More` category.
-   Do NOT add a question-mark category.
-   Do NOT replace the category rail with a separate category page.
-   Do NOT navigate to a full white CategoryScreen when a category is
    selected from Home.
-   Do NOT create duplicate Supabase clients.
-   Do NOT create duplicate navigation systems.
-   Do NOT create duplicate repositories/hooks/models if equivalent
    implementations already exist.
-   Do NOT hardcode business catalog data inside HomeScreen.
-   Do NOT expose Supabase service-role/secret keys to React Native.
-   Do NOT introduce unnecessary Redux/global state.
-   Do NOT introduce unnecessary libraries.
-   Do NOT rewrite unrelated screens.
-   Do NOT enter an endless inspect/fix/reinspect loop.

------------------------------------------------------------------------

# 1. CORE PRODUCT CHANGE

## CURRENT BEHAVIOR

Currently:

``` text
Home
  ↓
tap category
  ↓
navigate to CategoryScreen
  ↓
new white page
  ↓
new header
  ↓
category services
```

This must change.

## TARGET BEHAVIOR

A category tap from the Home category rail is a **Home context switch**,
not a page navigation.

``` text
HOME SHELL
│
├── Header
├── Location
├── Search
├── Category Rail
│
├── Dynamic Hero
│
└── Dynamic Catalog
```

When the user selects:

``` text
Cleaning
```

the existing Home screen remains mounted.

Only the active Home context changes:

``` text
selectedCategoryId = cleaning
```

This causes:

``` text
Hero theme
Hero image
Hero title
Hero subtitle
Hero CTA
Catalog sections
Service cards
Active category indicator
```

to transition smoothly.

There must be:

**NO page change.**

**NO white flash.**

**NO duplicate header.**

**NO route transition.**

**NO remount of the entire Home screen.**

------------------------------------------------------------------------

# 2. PRODUCT EXPERIENCE MODEL

Think of Home as a persistent commerce shell with a dynamic category
context.

``` text
                 HOME SHELL
                     │
       ┌─────────────┼─────────────┐
       │             │             │
     Header        Search       Category Rail
                                   │
                           selectedCategoryId
                                   │
                                   ▼
                         Category Experience
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                Hero            Catalog          Theme
                  │                │                │
             image/title       services         colors
             CTA/subtitle      sections        typography
```

The shell stays stable.

The experience changes.

------------------------------------------------------------------------

# 3. CATEGORY IS A DOMAIN CONTEXT

Do NOT model a category as merely:

``` text
name + icon
```

A production category should represent a complete customer experience.

Conceptually:

``` ts
interface CategoryExperience {
  category: ServiceCategory;
  hero: CategoryHero;
  catalog: CategoryCatalog;
  theme: CategoryTheme;
}
```

This is a composition model, not inheritance-heavy OOP.

------------------------------------------------------------------------

# 4. MODERN OOP / DESIGN PRINCIPLES

React Native + TypeScript should use **composition over inheritance**.

Do NOT create:

``` text
class CleaningCategory extends Category
class ElectricalCategory extends Category
class PlumbingCategory extends Category
```

Instead use:

``` text
ServiceCategory
CategoryHero
CategoryTheme
CategoryCatalog
CategoryExperience
```

with interfaces/types and composition.

## Recommended principles

### Single Responsibility

Each layer has one responsibility.

``` text
UI
→ render

Hook
→ coordinate state/data

Repository
→ retrieve data

Mapper
→ convert database rows to domain objects

Service
→ business/application logic

Animation controller
→ visual transitions
```

### Open/Closed Principle

Adding:

``` text
Gardening
Decor
Pest Control
```

must not require rewriting HomeScreen conditionals.

### Dependency Inversion

UI must depend on repository/service interfaces rather than Supabase
query details.

### Encapsulation

Supabase row structure must not leak throughout UI components.

### Composition

Build:

``` text
CategoryExperience
  = Category
  + Hero
  + Theme
  + Catalog
```

rather than category subclasses.

------------------------------------------------------------------------

# 5. TARGET COMPONENT ARCHITECTURE

Adapt this to the existing project. Do not duplicate equivalent files.

``` text
HomeScreen
│
├── HomeShell
│
├── HomeHeader
│   ├── Brand
│   ├── ServiceTime
│   ├── LocationControl
│   └── ProfileButton
│
├── SearchBar
│
├── StickyCategoryRail
│   └── CategoryItem
│
├── CategoryHero
│   ├── AdaptiveHeroBackground
│   ├── HeroImageTransition
│   ├── HeroContentTransition
│   └── HeroCTA
│
├── CategoryCatalog
│   ├── CatalogSection
│   └── ServiceCard
│
└── BottomNavigation
```

Data/application layer:

``` text
hooks/
  useHomeExperience
  useCategories
  useCategoryExperience
  useServiceSearch

repositories/
  categoryRepository
  heroRepository
  serviceRepository

domain/
  ServiceCategory
  CategoryHero
  CategoryTheme
  Service
  CategoryExperience

utils/
  image
  colors
  search
```

Use existing project conventions if different.

------------------------------------------------------------------------

# 6. DATABASE ARCHITECTURE

First inspect the existing Supabase schema.

If equivalent tables already exist:

**ALTER/extend them. Do not create competing duplicate tables.**

If the required model does not exist, create the following production
schema.

------------------------------------------------------------------------

# 7. SQL --- SERVICE CATEGORIES

``` sql
create extension if not exists pgcrypto;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),

  parent_id uuid references public.service_categories(id) on delete restrict,

  slug text not null unique,
  name text not null,
  short_name text,
  description text,

  icon text not null,

  display_order integer not null default 0,

  is_active boolean not null default true,
  is_featured boolean not null default false,
  show_on_home boolean not null default true,

  search_keywords text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_categories_home
on public.service_categories(show_on_home, is_active, display_order);

create index if not exists idx_service_categories_parent
on public.service_categories(parent_id);

create index if not exists idx_service_categories_slug
on public.service_categories(slug);
```

------------------------------------------------------------------------

# 8. SQL --- SERVICES

If the existing `services` table is structurally different, map the
existing table rather than blindly replacing it.

Required conceptual fields:

``` sql
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),

  category_id uuid not null
    references public.service_categories(id) on delete restrict,

  subcategory_id uuid
    references public.service_categories(id) on delete restrict,

  slug text not null unique,

  name text not null,
  short_name text,
  description text,
  short_description text,

  image_url text,
  thumbnail_url text,

  base_price numeric(10,2),

  pricing_type text not null default 'fixed'
    check (
      pricing_type in (
        'fixed',
        'starting_from',
        'inspection_required',
        'quote_required'
      )
    ),

  duration_minutes integer,

  included_items jsonb not null default '[]'::jsonb,
  excluded_items jsonb not null default '[]'::jsonb,
  common_issues jsonb not null default '[]'::jsonb,

  search_keywords text[] not null default '{}',

  is_active boolean not null default true,
  is_featured boolean not null default false,

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_category
on public.services(category_id, is_active, display_order);

create index if not exists idx_services_subcategory
on public.services(subcategory_id);

create index if not exists idx_services_slug
on public.services(slug);

create index if not exists idx_services_active
on public.services(is_active);
```

------------------------------------------------------------------------

# 9. SQL --- CATEGORY HERO ASSETS

Hero content must be database-driven.

``` sql
create table if not exists public.category_hero_assets (
  id uuid primary key default gen_random_uuid(),

  category_id uuid not null
    references public.service_categories(id) on delete cascade,

  name text not null,

  storage_path text not null,

  image_url text not null,
  mobile_image_url text,

  title text,
  subtitle text,
  cta_label text,

  primary_color text,
  secondary_color text,
  tertiary_color text,

  gradient_start text,
  gradient_end text,

  text_color text default '#FFFFFF',
  overlay_color text,

  display_order integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_category_hero_category
on public.category_hero_assets(category_id, is_active, display_order);
```

------------------------------------------------------------------------

# 10. SQL --- CATEGORY THEME

The category theme should support controlled brand-safe colors.

``` sql
create table if not exists public.category_themes (
  id uuid primary key default gen_random_uuid(),

  category_id uuid not null unique
    references public.service_categories(id) on delete cascade,

  primary_color text not null,
  secondary_color text,
  surface_color text,
  accent_color text,

  text_color text not null default '#111111',
  muted_text_color text default '#666666',

  button_color text,
  button_text_color text default '#FFFFFF',

  gradient_start text,
  gradient_mid text,
  gradient_end text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

------------------------------------------------------------------------

# 11. CATEGORY COLOR SYSTEM

The application must support distinct category identities.

These colors are NOT arbitrary UI decoration.

They define the Hero experience.

Initial design direction:

  Category          Primary direction       Visual character
  ----------------- ----------------------- ------------------
  AC & Appliances   Light blue              cool, clean
  Cleaning          Soft mint/green         fresh
  Electrical        Warm amber/yellow       energetic
  Plumbing          Light cyan/blue         water
  Painting          Soft coral/peach        creative
  RO & Water        Aqua/blue               clean water
  Carpentry         Warm wood/beige         natural
  Pest Control      Light green             organic
  Gardening         Green                   botanical
  Home Decor        Velvet red / burgundy   premium
  Laundry           Soft lavender/blue      clean/fresh
  Home Moving       Soft orange             movement/warmth
  Beauty            Soft blush/pink         premium/soft

These are starting visual directions, not rigid hardcoded values.

The final palette should be stored in the database and may be derived
from the Hero asset.

------------------------------------------------------------------------

# 12. ADAPTIVE HERO COLOR SYSTEM

There are TWO inputs:

``` text
Category Theme
+
Hero Image Dominant Palette
```

The final rendered Hero color is derived from both.

Do NOT blindly use raw image colors.

Example:

``` text
Hero image
    ↓
dominant palette
    ↓
harmonization
    ↓
contrast correction
    ↓
category theme constraints
    ↓
final gradient
```

This allows:

``` text
Gardening image
→ green family

Pest Control image
→ light green family

AC image
→ light blue family

Decor image
→ velvet red/burgundy family
```

while preventing visually ugly neon colors.

------------------------------------------------------------------------

# 13. PALETTE EXTRACTION RULE

Do NOT analyze the full Hero image on every Home render.

Correct pipeline:

``` text
Hero uploaded
    ↓
optimize image
    ↓
extract dominant colors ONCE
    ↓
store palette in DB
    ↓
Home fetches metadata
    ↓
Hero renders immediately
```

Never:

``` text
Home render
 ↓
download image
 ↓
analyze pixels
 ↓
calculate palette
 ↓
render
```

That is unnecessarily expensive.

------------------------------------------------------------------------

# 14. HERO IMAGE STORAGE

Use Supabase Storage.

Recommended conceptual bucket:

``` text
hero-assets
```

Structure:

``` text
hero-assets/
  categories/
    ac/
    cleaning/
    electrical/
    plumbing/
    painting/
    gardening/
    pest-control/
    decor/
```

Store only references/URLs in PostgreSQL.

Never store image binary/base64 in database rows.

------------------------------------------------------------------------

# 15. IMAGE OPTIMIZATION

For mobile:

``` text
original upload
      ↓
optimized asset
      ↓
CDN / image transformation
      ↓
mobile-sized WebP
```

Use transformed dimensions appropriate to the Hero container.

Do not download unnecessarily large originals.

Maintain:

-   aspect ratio
-   sharpness
-   compression
-   cacheability

Use the existing image pipeline if already implemented.

------------------------------------------------------------------------

# 16. CATEGORY EXPERIENCE OBJECT

The UI should consume a domain model similar to:

``` ts
interface CategoryExperience {
  category: ServiceCategory;

  hero: {
    id: string;
    imageUrl: string;
    title: string;
    subtitle: string;
    ctaLabel: string;

    palette: {
      primary: string;
      secondary: string;
      tertiary?: string;
      gradientStart: string;
      gradientEnd: string;
      textColor: string;
    };
  };

  theme: {
    primaryColor: string;
    secondaryColor: string;
    buttonColor: string;
    buttonTextColor: string;
  };

  catalog: {
    sections: CatalogSection[];
  };
}
```

Adapt names to existing models.

------------------------------------------------------------------------

# 17. CATEGORY RAIL BEHAVIOR

The category rail is permanent Home navigation.

Example:

``` text
AC & Appliances
Cleaning
Electrical
Plumbing
Painting
RO & Water
Carpentry
Pest Control
Gardening
Decor
Laundry
Moving
Beauty
```

All categories exist directly in the horizontal rail.

No `More`.

No question mark.

Horizontal scrolling is the overflow mechanism.

------------------------------------------------------------------------

# 18. CATEGORY RAIL UI

Maintain:

-   compact horizontal items
-   thin line icons
-   short labels
-   subtle active background
-   subtle active underline
-   smooth active indicator movement

Do not use random category colors inside the rail.

The category identity primarily appears through:

-   Hero
-   Hero gradient
-   CTA
-   catalog context

The rail remains visually consistent.

------------------------------------------------------------------------

# 19. CATEGORY TAP LOGIC

When the user taps:

``` text
Electrical
```

DO NOT:

``` ts
navigation.navigate('CategoryScreen')
```

Instead:

``` ts
selectCategory('electrical-id')
```

The Home screen remains mounted.

------------------------------------------------------------------------

# 20. ACTIVE CATEGORY STATE

There must be one authoritative state:

``` ts
selectedCategoryId
```

Do not maintain multiple competing states such as:

``` text
selectedCategory
activeCategory
currentCategory
heroCategory
catalogCategory
```

unless there is a clear derived-state reason.

Prefer:

``` text
selectedCategoryId
      ↓
activeCategory
      ↓
activeExperience
```

where the latter values are derived/memoized.

------------------------------------------------------------------------

# 21. STATE MACHINE

Conceptually:

``` text
IDLE
 ↓
LOADING
 ↓
READY
 ↓
TRANSITIONING
 ↓
READY
```

Errors:

``` text
LOADING
 ↓
ERROR
 ↓
RETRY
 ↓
LOADING
```

When a user switches categories rapidly:

``` text
Cleaning
 ↓
Electrical
 ↓
Plumbing
 ↓
Gardening
```

the final user selection must win.

No stale request may overwrite the final state.

------------------------------------------------------------------------

# 22. ASYNC STALE-RESULT PROTECTION

Every category request must be protected from stale responses.

Concept:

``` text
request A = Cleaning
request B = Electrical
request C = Gardening
```

If A returns after C:

``` text
DO NOT apply A.
```

Use one of:

-   AbortController where supported
-   request sequence ID
-   active request token
-   stale response guard

Use the mechanism compatible with the existing React Native/Supabase
architecture.

------------------------------------------------------------------------

# 23. PREFETCHING

Do not wait for every tap to start a network request.

At Home initialization:

``` text
load categories
        ↓
identify visible/featured categories
        ↓
prefetch likely experiences
        ↓
cache them
```

Do not prefetch unlimited data.

Prioritize:

-   active/default category
-   first visible categories
-   featured categories

------------------------------------------------------------------------

# 24. CACHE ARCHITECTURE

Conceptually:

``` text
CategoryExperienceCache

AC
 ├── hero
 └── catalog

Cleaning
 ├── hero
 └── catalog

Electrical
 ├── hero
 └── catalog
```

Cache key:

``` text
categoryId
```

Not:

``` text
categoryName
```

------------------------------------------------------------------------

# 25. CATEGORY SWITCH ANIMATION

Use React Native Reanimated.

Do not use route transitions.

Do not use arbitrary timers to sequence UI.

The transition should be coordinated.

Target duration:

``` text
250–450 ms
```

Tune after device testing.

The experience must feel fast.

------------------------------------------------------------------------

# 26. COLOR INTERPOLATION

When switching:

``` text
Cleaning
→
Electrical
```

interpolate:

``` text
gradientStart
gradientEnd
buttonColor
```

Example:

``` text
green
 ↓
green-yellow
 ↓
amber
```

Do not hard cut.

Use Reanimated color interpolation where supported by the existing
implementation.

------------------------------------------------------------------------

# 27. HERO IMAGE TRANSITION

Use layered images.

Concept:

``` text
OLD IMAGE
opacity 1 → 0
scale 1 → 1.02

NEW IMAGE
opacity 0 → 1
scale 1.02 → 1
```

Keep the transition subtle.

Do not use aggressive zooms.

Do not make it look like a slideshow.

------------------------------------------------------------------------

# 28. HERO TEXT TRANSITION

Old content:

``` text
fade out
translate slightly upward
```

New content:

``` text
fade in
translate slightly upward into place
```

Example:

``` text
Cleaning:
"Keep your home spotless"

Electrical:
"Power your home safely"
```

The text must remain inside the Hero.

------------------------------------------------------------------------

# 29. HERO CTA TRANSITION

CTA must update with the active category.

Examples:

``` text
Book Cleaning
Book AC Service
Book Electrician
Book Plumbing
Explore Decor
Book Gardening
```

Use real database-driven labels.

Do not hardcode category-specific CTA conditionals in HomeScreen.

Animate:

-   label
-   background color
-   text color where needed

------------------------------------------------------------------------

# 30. CATALOG TRANSITION

The catalog below the Hero changes with the category.

Example:

``` text
Cleaning
 ├── Deep Cleaning
 ├── Sofa Cleaning
 └── Bathroom Cleaning
```

switches to:

``` text
Electrical
 ├── Fan Installation
 ├── Switch Repair
 └── Electrical Inspection
```

Use:

``` text
old catalog
opacity 1 → 0
small translate

new catalog
opacity 0 → 1
small translate
```

Do not animate every pixel excessively.

The transition should feel like content replacement inside a persistent
page.

------------------------------------------------------------------------

# 31. PRESERVE HOME HEADER

These remain stable:

``` text
Serventica
20 minutes
Location
Profile
Search
```

Do not animate them during category switching.

This is critical to preserve the persistent-shell feeling.

------------------------------------------------------------------------

# 32. LOCATION INTERACTION

The previously encountered location hit-testing issue must remain fixed.

The location area must intercept its own touches.

It must never accidentally activate the category rail underneath.

Inspect:

-   zIndex
-   elevation
-   absolute positioning
-   pointerEvents
-   overlapping views
-   parent Pressables
-   transparent overlays
-   hitSlop

Fix the actual hit-test hierarchy.

Do not blindly increase zIndex.

Validate:

``` text
tap location
→ location control opens

tap category
→ category changes

tap profile
→ profile opens
```

No cross-triggering.

------------------------------------------------------------------------

# 33. STICKY CATEGORY RAIL

Use ONE primary vertical scrolling container.

Initial:

``` text
Header
Location
Search
Category Rail
Hero
Catalog
```

On scroll:

``` text
Category Rail
----------------
Hero
Catalog
```

The category rail remains sticky.

Do not create nested vertical ScrollViews.

Horizontal FlatList/scrolling for categories is allowed.

------------------------------------------------------------------------

# 34. SEARCH INTEGRATION

Search and category switching must use the same catalog domain.

Example:

``` text
"AC not cooling"
```

can produce:

``` text
Service:
AC Not Cooling
Category:
AC & Appliances
```

Tapping a specific service result:

``` text
→ ServiceDetails
```

Tapping a category result:

``` text
→ change Home selectedCategoryId
```

Do not create a separate inconsistent catalog for search.

------------------------------------------------------------------------

# 35. SERVICE DETAIL NAVIGATION

Category selection stays on Home.

Service selection can navigate.

Correct:

``` text
Home
 ↓
tap category
 ↓
Home context changes
```

and:

``` text
Home
 ↓
tap service
 ↓
ServiceDetails
```

ServiceDetails should receive:

``` ts
{
  serviceId,
  slug
}
```

not the entire service object.

------------------------------------------------------------------------

# 36. SERVICE CARD DATA

Service cards should be real database entities.

At minimum:

``` text
id
name
shortDescription
imageUrl
pricingType
basePrice
duration
categoryId
```

Display pricing honestly.

Examples:

``` text
₹499
From ₹299
Inspection required
Get a quote
```

Never invent prices.

Never invent ratings.

Never invent reviews.

------------------------------------------------------------------------

# 37. LOADING EXPERIENCE

When category experience is loading:

Do NOT blank the entire screen.

Keep:

-   header
-   search
-   category rail
-   existing shell

stable.

Only dynamic areas should show:

-   skeleton Hero
-   skeleton catalog
-   placeholder images

If cached data exists:

render cached data immediately and refresh in background.

------------------------------------------------------------------------

# 38. ERROR EXPERIENCE

If Hero fails:

use existing fallback Hero.

If catalog fails:

show:

``` text
Unable to load services
[Try Again]
```

If category experience completely fails:

preserve the Home shell.

Never crash the application.

Never show raw Supabase errors.

------------------------------------------------------------------------

# 39. EMPTY STATE

If a category has no active services:

``` text
No services available in this category yet.
```

Do not display fake cards.

------------------------------------------------------------------------

# 40. SECURITY / RLS

Enable Row Level Security.

Customer-facing users may read appropriate active catalog records.

Customers must not modify:

-   categories
-   services
-   Hero assets
-   category themes

Do not solve access problems by disabling RLS.

Never expose:

``` text
service_role
secret keys
admin credentials
```

in the mobile application.

------------------------------------------------------------------------

# 41. SQL --- RLS CONCEPT

Adapt to the project's current authentication model.

Example:

``` sql
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.category_hero_assets enable row level security;
alter table public.category_themes enable row level security;
```

Customer read policies should expose only intended active
customer-facing records.

Do not blindly execute duplicate policies.

Inspect existing policies first.

------------------------------------------------------------------------

# 42. ICON SYSTEM

Continue using the existing modern icon library.

Preferred:

``` text
lucide-react-native
```

Database stores an icon identifier:

``` text
snowflake
sparkles
zap
droplets
brush
leaf
bug
lamp
sofa
shirt
truck
heart
```

Create a resolver:

``` text
categoryIconMap
```

Unknown icon:

``` text
safe fallback
```

Never crash because of invalid icon metadata.

------------------------------------------------------------------------

# 43. DESIGN LANGUAGE

The UI should feel like a modern Indian on-demand commerce application.

Characteristics:

-   clean
-   fast
-   minimal
-   premium
-   soft rounded geometry
-   thin line icons
-   high readability
-   controlled color
-   subtle shadows
-   generous whitespace
-   responsive animation

Do not directly copy proprietary Blinkit UI.

Use the screenshots only as UX inspiration.

------------------------------------------------------------------------

# 44. COLOR DESIGN RULES

Do NOT use random rainbow colors inside every component.

Instead:

``` text
CATEGORY COLOR
      ↓
Hero background
Hero gradient
CTA
subtle selected state
```

Neutral UI remains:

``` text
white
near-black
gray
soft borders
```

This preserves brand consistency.

------------------------------------------------------------------------

# 45. EXAMPLE CATEGORY THEMES

## AC & Appliances

``` text
Primary:
light blue

Gradient:
very light blue → soft cyan

CTA:
deeper blue

Image:
AC technician / appliance service
```

## Cleaning

``` text
Primary:
soft mint green

Gradient:
pale green → fresh mint

CTA:
green

Image:
professional cleaning
```

## Electrical

``` text
Primary:
warm yellow / amber

Gradient:
pale yellow → warm amber

CTA:
amber/deep yellow

Image:
electrician
```

## Plumbing

``` text
Primary:
light blue/cyan

Gradient:
pale cyan → soft blue

CTA:
blue

Image:
plumber
```

## Pest Control

``` text
Primary:
light green

Gradient:
pale green → natural green

CTA:
green

Image:
pest-control professional
```

## Gardening

``` text
Primary:
green

Gradient:
light botanical green → deeper natural green

CTA:
green

Image:
gardener/plants
```

## Home Decor

``` text
Primary:
velvet red / burgundy

Gradient:
soft rose-burgundy → deep velvet red

CTA:
burgundy

Image:
premium interior/decor
```

These are design directions. Final values must remain accessible and
harmonized with the actual Hero image.

------------------------------------------------------------------------

# 46. CONTRAST MANAGEMENT

Never sacrifice readability for adaptive color.

For every generated palette:

1.  Calculate/verify contrast.
2.  Adjust lightness/saturation if needed.
3.  Select readable text color.
4.  Add a subtle overlay if necessary.
5.  Preserve visual hierarchy.

The adaptive system must never produce:

``` text
white text
on nearly-white background
```

or:

``` text
black text
on near-black image
```

------------------------------------------------------------------------

# 47. IMAGE + COLOR COORDINATION

The upper Hero section should visually belong to the lower Hero image.

Concept:

``` text
UPPER SECTION
     ↓
palette derived from lower image
     ↓
smooth gradient
     ↓
divider
     ↓
LOWER HERO IMAGE
```

This creates one connected visual Hero rather than two unrelated blocks.

------------------------------------------------------------------------

# 48. HERO STRUCTURE

Target:

``` text
┌───────────────────────────────────────┐
│                                       │
│          ADAPTIVE CATEGORY COLOR      │
│                                       │
│              Serventica               │
│              20 minutes               │
│              Location                 │
│              Search                   │
│                                       │
│        CATEGORY NAVIGATION            │
│                                       │
├───────────────────────────────────────┤
│                                       │
│          CATEGORY HERO IMAGE          │
│                                       │
│             TITLE                     │
│             SUBTITLE                  │
│             CTA                       │
│                                       │
└───────────────────────────────────────┘
```

The upper color must adapt.

The lower image must change.

The content must change.

------------------------------------------------------------------------

# 49. CATEGORY SWITCH TIMELINE

Target choreography:

``` text
T0
user taps category

T0–100ms
active indicator begins moving

T0–350ms
background colors interpolate

T0–400ms
Hero image crossfades

T0–300ms
Hero text transitions

T0–300ms
CTA transitions

T0–400ms
catalog transitions

T400ms
new context stable
```

These timings are guidelines, not rigid requirements.

Optimize based on actual Android device performance.

------------------------------------------------------------------------

# 50. RAPID SWITCHING

If the user performs:

``` text
AC
→ Cleaning
→ Electrical
→ Gardening
```

within a short period:

-   cancel/ignore stale transitions
-   final selection wins
-   do not queue four animations
-   do not produce broken intermediate state
-   do not flash white
-   do not remount Home

Use a transition token/version if needed.

------------------------------------------------------------------------

# 51. PERFORMANCE RULES

Avoid:

-   image pixel processing during render
-   full Home remount
-   unnecessary state updates
-   nested vertical ScrollViews
-   loading original-resolution images
-   rendering huge catalogs at once
-   unnecessary global state
-   repeated Supabase requests
-   expensive JS-thread animations

Prefer:

-   Reanimated UI-thread animations
-   FlatList
-   memoized components
-   stable callbacks
-   cached data
-   optimized image URLs
-   database filtering
-   prefetching
-   stale-result protection

------------------------------------------------------------------------

# 52. COMPONENT MEMOIZATION

Use memoization where it has measurable value.

Candidates:

``` text
CategoryItem
ServiceCard
CatalogSection
```

Do not wrap every component in `memo` blindly.

------------------------------------------------------------------------

# 53. HOME SCREEN RESPONSIBILITY

HomeScreen should orchestrate.

It should NOT contain:

-   Supabase queries
-   huge category arrays
-   business rules
-   image palette extraction
-   category-specific if/else blocks
-   pricing calculations
-   database row mapping

Avoid:

``` ts
if (category.name === 'Cleaning') ...
if (category.name === 'Electrical') ...
```

The Home UI should consume:

``` text
activeExperience
```

------------------------------------------------------------------------

# 54. REPOSITORY RESPONSIBILITY

Repositories handle:

``` text
fetch categories
fetch category hero
fetch category theme
fetch services
fetch category experience
```

They should not render UI.

------------------------------------------------------------------------

# 55. MAPPER RESPONSIBILITY

Map:

``` text
Supabase row
↓
domain model
```

Example:

``` text
mapCategoryRow
mapHeroRow
mapServiceRow
mapThemeRow
```

This protects the UI from schema changes.

------------------------------------------------------------------------

# 56. HOOK RESPONSIBILITY

`useHomeExperience()` should coordinate:

``` text
selectedCategoryId
available categories
active experience
loading
error
selectCategory()
retry()
```

Conceptually:

``` ts
const {
  categories,
  selectedCategoryId,
  activeExperience,
  isTransitioning,
  isLoading,
  error,
  selectCategory,
  retry
} = useHomeExperience();
```

------------------------------------------------------------------------

# 57. ANIMATION RESPONSIBILITY

Animation code should not be scattered through every component.

Centralize reusable transition logic.

Conceptually:

``` text
useCategoryTransition
HeroTransition
CatalogTransition
CategoryIndicatorTransition
```

Use shared timing/easing constants.

------------------------------------------------------------------------

# 58. NAVIGATION RESPONSIBILITY

Navigation rules:

``` text
Category tap
→ Home state change

Service tap
→ ServiceDetails

Profile tap
→ Profile

Orders tap
→ Orders

Saved tap
→ Saved
```

Do not use navigation as application state.

------------------------------------------------------------------------

# 59. BOTTOM NAVIGATION

Bottom navigation remains stable during category switching.

Do not change the selected bottom-tab state simply because a category
changes.

Home remains:

``` text
Home = active
```

while the category context changes inside Home.

------------------------------------------------------------------------

# 60. BACK BUTTON BEHAVIOR

On Android:

If the user has only switched categories:

``` text
Back
```

should NOT unexpectedly navigate through every category selection.

Category selection is state, not navigation history.

Use normal Home back behavior.

------------------------------------------------------------------------

# 61. SERVICE DETAILS EXCEPTION

A service is a distinct customer task/entity.

Therefore:

``` text
tap service
→ ServiceDetails route
```

is correct.

This keeps the app navigation semantically clean.

------------------------------------------------------------------------

# 62. SEARCH + CATEGORY COORDINATION

If search result is:

``` text
Electrical category
```

then:

``` text
selectCategory(electricalId)
```

and return/transition Home context.

If result is:

``` text
Fan Installation service
```

then:

``` text
navigate(ServiceDetails)
```

This gives search predictable semantics.

------------------------------------------------------------------------

# 63. ACCESSIBILITY

All interactive elements require meaningful accessibility labels.

Examples:

``` text
"Cleaning category"
"Electrical category"
"Gardening category"
"Open location selector"
"Search services"
"Book cleaning service"
```

Touch targets should be approximately:

``` text
44 × 44 dp minimum
```

Do not reduce touch areas merely to fit more categories.

------------------------------------------------------------------------

# 64. DATABASE SEED DATA

If categories are missing, seed only real Serventica categories.

Example:

``` text
AC & Appliances
Cleaning
Electrical
Plumbing
Painting
RO & Water
Carpentry
Pest Control
Gardening
Home Decor
Laundry
Home Moving
Beauty
```

Use stable slugs:

``` text
ac-appliances
cleaning
electrical
plumbing
painting
ro-water
carpentry
pest-control
gardening
home-decor
laundry
home-moving
beauty
```

Do not use display names as IDs.

------------------------------------------------------------------------

# 65. HERO CONTENT EXAMPLES

Do not hardcode these into React Native.

These are examples of database content.

### Gardening

``` text
Title:
Grow your space

Subtitle:
Professional gardening and plant care at home

CTA:
Book Gardening
```

### Pest Control

``` text
Title:
A cleaner, safer home

Subtitle:
Professional pest control at your doorstep

CTA:
Book Pest Control
```

### Electrical

``` text
Title:
Power your home safely

Subtitle:
Verified electricians for repairs and installations

CTA:
Book Electrician
```

### Decor

``` text
Title:
Make your space yours

Subtitle:
Home decor and styling services for every room

CTA:
Explore Decor
```

------------------------------------------------------------------------

# 66. CATEGORY CATALOG STRUCTURE

The catalog should support sections.

Example:

``` text
Cleaning
│
├── Popular Cleaning
│     ├── Deep Cleaning
│     └── Bathroom Cleaning
│
├── Furniture & Fabric
│     ├── Sofa Cleaning
│     └── Mattress Cleaning
│
└── Specialty
      └── Move-in Cleaning
```

Domain model:

``` ts
interface CatalogSection {
  id: string;
  title: string;
  services: Service[];
}
```

Do not force every category into identical sections.

------------------------------------------------------------------------

# 67. FUTURE-PROOF BOOKING ARCHITECTURE

This phase does NOT implement booking.

But the domain should support:

``` text
Service
 ↓
Service Package
 ↓
Service Option
 ↓
Address
 ↓
Slot
 ↓
Provider
 ↓
Booking
```

Do not collapse all future booking information into the current Service
table.

------------------------------------------------------------------------

# 68. FUTURE SERVICE PACKAGE MODEL

If/when booking is implemented:

``` text
AC Repair
 ├── Inspection
 ├── Minor Repair
 └── Major Repair
```

A service can therefore later expose:

``` text
Service
→ Packages
→ Options
→ Pricing
```

Do not prematurely build the full booking engine now.

------------------------------------------------------------------------

# 69. TESTING MATRIX

Test category transitions:

``` text
AC → Cleaning
Cleaning → Electrical
Electrical → Plumbing
Plumbing → Painting
Painting → RO
RO → Gardening
Gardening → Pest Control
Pest Control → Decor
Decor → Laundry
Laundry → Moving
Moving → Beauty
```

Also test reverse direction.

Also test:

``` text
AC → AC
```

Tapping the already-active category should not unnecessarily
refetch/reanimate.

------------------------------------------------------------------------

# 70. EDGE CASE TESTING

Test:

-   no internet
-   slow internet
-   empty category
-   inactive category
-   missing Hero
-   missing image
-   invalid icon
-   invalid palette
-   malformed service
-   rapid category tapping
-   rapid service tapping
-   Android back
-   screen background/foreground
-   app restart
-   cold start
-   cached Home
-   expired/stale data
-   location tap
-   profile tap
-   search while category is switching

------------------------------------------------------------------------

# 71. VISUAL ACCEPTANCE

The final experience must visually communicate:

``` text
ONE PAGE
ONE HEADER
ONE HOME
ONE CONTEXT
```

not:

``` text
Home
↓
new page
↓
new header
↓
new screen
```

When switching categories, the user should perceive a continuous
transformation.

------------------------------------------------------------------------

# 72. PERFORMANCE ACCEPTANCE

Target:

-   no visible white flash
-   no layout jump
-   no dropped-frame-heavy transition
-   no obvious image loading flicker after cache warm-up
-   no repeated database requests for cached categories
-   no unnecessary Home remount
-   no stale category replacing final selection

The animation must remain smooth on a normal Android emulator/device,
not only a high-end development machine.

------------------------------------------------------------------------

# 73. DATABASE ACCEPTANCE

Verify:

``` text
categories
heroes
themes
services
```

have proper relationships.

Verify:

``` text
category → hero
category → theme
category → services
```

all use stable IDs.

Verify RLS.

Verify indexes.

Verify no duplicate schema was created.

------------------------------------------------------------------------

# 74. MIGRATION SAFETY

Before modifying Supabase:

1.  Inspect existing tables.
2.  Inspect columns.
3.  Inspect constraints.
4.  Inspect indexes.
5.  Inspect RLS policies.
6.  Inspect existing data.

Then choose:

``` text
ALTER existing schema
```

OR:

``` text
CREATE missing tables
```

Never blindly drop production data.

Never run destructive SQL without explicit necessity.

Do not use:

``` sql
drop table ...
```

as a shortcut.

------------------------------------------------------------------------

# 75. BACKWARD COMPATIBILITY

If an old CategoryScreen already exists:

Do not immediately delete it.

First determine whether it is used by:

-   deep links
-   existing routes
-   old flows
-   service navigation
-   external entry points

Home category taps should stop navigating there.

Keep or refactor the old route only if required.

------------------------------------------------------------------------

# 76. LOGGING

Development logs may include:

``` text
category selection
experience fetch duration
cache hit/miss
stale response ignored
```

Do not log:

-   secrets
-   tokens
-   personal location data unnecessarily
-   sensitive customer information

Remove noisy debug logging from production builds.

------------------------------------------------------------------------

# 77. ERROR OBSERVABILITY

Do not silently swallow errors.

Use the existing error/logging abstraction if available.

At minimum distinguish:

``` text
network
database
mapping
image
navigation
```

The UI should show user-safe messages.

------------------------------------------------------------------------

# 78. NO OVER-ENGINEERING

Do not add:

-   Redux solely for category selection
-   a state-management library solely for this feature
-   a CMS
-   a backend server solely for this feature
-   a new animation library
-   duplicate caching libraries
-   unnecessary design-system packages

Use the existing stack.

------------------------------------------------------------------------

# 79. IMPLEMENTATION ORDER

Implement in exactly this logical order.

## Phase 1 --- Audit

Inspect current architecture.

## Phase 2 --- Database

Extend/create required schema safely.

## Phase 3 --- Domain models

Create typed category/hero/theme/service models.

## Phase 4 --- Repositories

Implement data retrieval.

## Phase 5 --- Mapping

Map Supabase rows to domain models.

## Phase 6 --- Home hook

Implement:

``` text
useHomeExperience
```

## Phase 7 --- Remove category route behavior

Category rail becomes Home state switching.

## Phase 8 --- Hero transition

Implement:

``` text
color
image
text
CTA
```

transitions.

## Phase 9 --- Catalog transition

Implement service/catalog transformation.

## Phase 10 --- Cache/prefetch

Add controlled caching.

## Phase 11 --- Error/loading states

Implement production states.

## Phase 12 --- Validation

Run complete test matrix.

------------------------------------------------------------------------

# 80. IMPORTANT IMPLEMENTATION RULE

Do not replace the entire Home screen simply because the architecture
changes.

Prefer:

``` text
existing UI
+
controlled refactor
+
new dynamic state
+
new data layer
+
transition layer
```

This minimizes regression risk.

------------------------------------------------------------------------

# 81. ACCEPTANCE FLOW

Run exactly:

``` text
App starts
 ↓
Home appears
 ↓
Default category active
 ↓
Hero appears
 ↓
Hero upper color matches Hero palette
 ↓
Category rail appears
 ↓
Tap Cleaning
 ↓
NO navigation
 ↓
Hero color smoothly changes
 ↓
Hero image crossfades
 ↓
Hero text changes
 ↓
CTA changes
 ↓
Cleaning catalog appears
 ↓
Tap Electrical
 ↓
NO white page
 ↓
Color interpolates
 ↓
Image changes smoothly
 ↓
Text changes smoothly
 ↓
Electrical catalog appears
 ↓
Tap Gardening
 ↓
Green theme appears
 ↓
Gardening image appears
 ↓
Gardening catalog appears
 ↓
Tap Decor
 ↓
Velvet-red theme appears
 ↓
Decor image appears
 ↓
Decor catalog appears
 ↓
Scroll Home
 ↓
Category rail sticks
 ↓
Header collapses as designed
 ↓
Tap location
 ↓
Location control works
 ↓
Tap search
 ↓
Real search works
 ↓
Tap service
 ↓
ServiceDetails opens
```

------------------------------------------------------------------------

# 82. RAPID INTERACTION ACCEPTANCE

Test:

``` text
AC
→ Cleaning
→ Electrical
→ Plumbing
→ Gardening
→ Decor
```

rapidly.

Final state must be:

``` text
Decor
```

with:

-   Decor Hero
-   Decor colors
-   Decor text
-   Decor CTA
-   Decor catalog

No stale category may appear.

------------------------------------------------------------------------

# 83. STOP CONDITION

This is extremely important.

Once all required behavior is implemented and acceptance criteria pass:

**STOP.**

Do not:

-   redesign unrelated screens
-   implement booking
-   implement payments
-   implement provider assignment
-   implement notifications
-   rewrite navigation
-   refactor unrelated files
-   repeatedly inspect the entire project
-   enter a fix → inspect everything → fix → inspect everything loop

Only fix issues directly related to this implementation.

------------------------------------------------------------------------

# 84. FINAL ENGINEERING REPORT

After implementation, return a concise report.

## Root Causes

Explain why category taps previously opened separate white pages.

## Architecture

Explain:

``` text
Home Shell
→ selectedCategoryId
→ CategoryExperience
→ Hero + Theme + Catalog
```

## Database

List:

-   existing tables reused
-   new tables
-   migrations
-   indexes
-   RLS changes

## Files Changed

List every modified/created file.

## State

Explain the source of truth for selected category.

## Animation

Explain:

-   color interpolation
-   image crossfade
-   text transition
-   CTA transition
-   catalog transition
-   rapid-tap handling

## Performance

Explain:

-   caching
-   prefetching
-   optimized images
-   request protection
-   FlatList
-   Reanimated

## Validation

List actual tests performed.

## Remaining Manual Actions

Only list actions genuinely requiring manual work.

------------------------------------------------------------------------

# 85. DEFINITION OF DONE

The implementation is complete only when:

-   [ ] Home remains mounted during category switching.
-   [ ] Category taps do not navigate to CategoryScreen.
-   [ ] Category selection changes Home context.
-   [ ] Header remains stable.
-   [ ] Search remains stable.
-   [ ] Location remains stable and interactive.
-   [ ] Category rail remains present.
-   [ ] No More category exists.
-   [ ] No question-mark category exists.
-   [ ] All categories are horizontally accessible.
-   [ ] Active category indicator animates.
-   [ ] Hero color interpolates.
-   [ ] Hero image crossfades.
-   [ ] Hero text transitions.
-   [ ] Hero CTA transitions.
-   [ ] Catalog transitions.
-   [ ] Category catalog comes from real Supabase data.
-   [ ] Hero comes from Supabase Storage/CDN.
-   [ ] Hero palette is stored as metadata.
-   [ ] Palette is not calculated on every render.
-   [ ] Category themes support category-specific color identities.
-   [ ] AC uses a light-blue visual direction.
-   [ ] Pest Control uses a light-green direction.
-   [ ] Gardening uses a green direction.
-   [ ] Decor uses a velvet-red/burgundy direction.
-   [ ] Other categories have appropriate controlled themes.
-   [ ] Colors remain contrast-safe.
-   [ ] Service cards use real data.
-   [ ] Search uses the same catalog domain.
-   [ ] Service navigation still works.
-   [ ] Loading states exist.
-   [ ] Empty states exist.
-   [ ] Error states exist.
-   [ ] Retry exists.
-   [ ] Cache/prefetch works where appropriate.
-   [ ] Stale async responses cannot overwrite the final selection.
-   [ ] RLS remains enabled.
-   [ ] No secret key is exposed.
-   [ ] No destructive database migration was performed unnecessarily.
-   [ ] No duplicate architecture was introduced.
-   [ ] No nested vertical scrolling was introduced.
-   [ ] Android emulator/device validation passes.
-   [ ] No runtime errors.
-   [ ] No navigation warnings.
-   [ ] No obvious transition flicker.
-   [ ] No unrelated functionality regressed.

# END OF IMPLEMENTATION SPECIFICATION
