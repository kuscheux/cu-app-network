# Platform: Left menu (SDLC-aligned) and content views

No login gate — all views are available as soon as a credit union is selected.

---

## Sidebar behavior

- **Collapse toggle** at the **top** of the left menu (when expanded).
- **Hover to expand:** When collapsed, hovering expands temporarily.
- **Theme:** Dark/Light toggle in sidebar footer and in the main header (quick toggle, not a nav item).
- **Collapse** = narrow icon strip with section icons. **Expand** = section labels (DISCOVER, DESIGN, etc.) + items.

---

## SDLC menu structure (every route defined)

Sections and items in order. Each item has a **route** (`/?view=id` or `href` for external) and optional **tabs** inside the view.

### 1. DISCOVER

| id | Name | Badge | Route / Tabs |
|----|------|-------|---------------|
| summary | Product Summary | NEW | `/?view=summary` |
| profile | CU Profile | — | `/?view=profile` |
| enrichment | Data Discovery | — | `/?view=enrichment` |
| schema-map | Schema Map | 700+ | `/?view=schema-map` |
| sources | Data Sources | — | `/?view=sources` |
| gallery | CU Gallery | 4,300+ | `/gallery` (href) |

### 2. DESIGN

| id | Name | Badge | Route / Tabs |
|----|------|-------|---------------|
| design-system | Design System | cu_ui | `/?view=design-system` |
| tokens | Design Tokens | CU UI | `/?view=tokens` |
| app-studio | Member App Studio | cu_ui | `/?view=app-studio` |
| preview | App Preview | — | `/?view=preview` |
| screen-inspector | Screen Inspector | 209+ | `/?view=screen-inspector` |

### 3. CONFIGURE

| id | Name | Badge | Route / Tabs |
|----|------|-------|---------------|
| config | Platform Configuration | — | `/?view=config` (16-tier editor) |
| call-center | Call Center / IVR | IVR | `/?view=call-center` (Lobby, IVR tabs) |
| omnichannel | Omnichannel | ALL | `/?view=omnichannel` |
| fraud | Fraud Network | Private | `/?view=fraud` |
| rules | Rule Builder | — | `/rules` (href) |
| marketing | Marketing Site | CMS | `/?view=marketing` |
| features | Feature Catalog | — | `/?view=features` |
| mapping | Field Mapping | — | `/?view=mapping` |
| support | Member Support | 3 | `/?view=support` |

### 4. TEST & LAUNCH

| id | Name | Badge | Route / Tabs |
|----|------|-------|---------------|
| uat | UAT Testing | 31 | `/?view=uat` |
| status | Environment Status | — | `/?view=status` |
| launch | Business Launch | 7 | `/?view=launch` |
| pilot-enroll | Enroll in Pilot | — | (opens sheet; not a view) |

### 5. OPERATE

| id | Name | Badge | Route / Tabs |
|----|------|-------|---------------|
| apps | App Reviews | — | `/?view=apps` |
| support-operate | Member Support | 3 | `/?view=support` (same view as Configure) |

### 6. SYSTEM

| id | Name | Badge | Route / Tabs |
|----|------|-------|---------------|
| github | GitHub CI/CD | — | `/?view=github` |
| codebase | Codebase | 432K | `/?view=codebase` |
| settings | Settings | — | (opens settings dialog; not a view) |

---

## Content views (main area) — all routes

- **summary** → `ProductSummaryDashboard`
- **config** → `CUConfigDashboard` (Platform Configuration; default when no `view` param — lands on Navy Federal)
- **app-studio** → `DualFlutterStudioShell` (Member App Studio)
- **call-center** → `CallCenterView` (Lobby + IVR tabs)
- **design-system** → `DesignSystemView` (AppBuilderStudio full)
- **preview** → `AppPreviewView`
- **status** → `StatusView` (Environment Status)
- **profile** → `CUPublicProfile` + `TenantProfileSidebar`
- **fraud** → `FraudNetworkDashboard`
- **enrichment** → `DiscoveryDashboard`
- **mapping** → `FieldMappingTable`
- **tokens** → `CuUIDesignTokens`
- **apps** → `AppsView`
- **support** → `SupportView`
- **github** → `GitHubView`
- **launch** → `BusinessLaunchChecklist`
- **sources** → `SourcesView`
- **uat** → `UATView`
- **omnichannel** → `OmnichannelArchitecture`
- **marketing** → `MarketingSitePreview`
- **features** → `FeatureCatalog`
- **codebase** → `CodebaseOverview`
- **screen-inspector** → `ScreenInspector`

**External routes:** `/gallery`, `/rules` — navigated via `href`; no `view` param.

**Actions (no view):** **Enroll in Pilot** opens pilot enrollment sheet; **Settings** opens settings dialog. **Theme** (Dark/Light) is a quick toggle in sidebar and header.
