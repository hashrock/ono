# Ono Minimization Summary

This document summarizes the changes made to minimize the Ono SSG framework while maintaining all core functionality.

## Changes Made

### 1. Removed Unused Files
- **cli.js.backup** (1,143 lines) - Old backup file that was not in use
- **TODO.md** - Outdated development checklist from initial project phase

### 2. Simplified CLI Commands
**Before:** 5 commands (build, watch, dev, serve, init)
**After:** 2 commands (build, dev)

**Removed Commands:**
- `watch` - Redundant with `dev` command (dev does watch + serve)
- `serve` - Minimal utility (users can use any static file server)
- `init` - Was documented but never implemented

**Remaining Commands:**
- `build` - Build JSX files to static HTML
- `dev` - Build, watch, and serve with live reload

### 3. Code Refactoring
- Deduplicated `getDynamicRoutePaths` helper function (was in both builder.js and watcher.js)
- Reduced watcher.js from 193 to 167 lines (26 lines saved)
- Reduced cli.js from 329 to 247 lines (82 lines saved)

### 4. Dependency Cleanup
- Removed unused rollup and rollup plugins (18 packages)
- Reduced from 141 to 123 total dependencies

### 5. Documentation Updates
- Updated README.md to reflect actual available commands
- Removed references to non-existent `init` command
- Added content collections and dynamic routes to features list
- Updated CLI command examples

## Impact Summary

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Source Lines | 1,718 | 1,613 | 105 lines (6.1%) |
| Dependencies | 141 | 123 | 18 packages |
| CLI Commands | 5 | 2 | 3 commands (60%) |

## Maintained Functionality

All core features are preserved:
- ✅ JSX runtime and rendering
- ✅ TypeScript JSX transformation
- ✅ Build system (files and directories)
- ✅ Dev server with live reload
- ✅ UnoCSS integration
- ✅ Content collections (markdown/frontmatter)
- ✅ Dynamic routes `[slug].jsx`
- ✅ Public API exports (bundler, resolver)
- ✅ Browser compiler (for REPL)

## Testing

- All 115 tests passing
- No breaking changes
- Snapshot tests updated for new CLI output

## Philosophy Alignment

These changes align with Ono's core philosophy:
- **Minimal Dependencies** ✅ Removed 18 unused packages
- **Simple Architecture** ✅ Reduced from 5 to 2 CLI commands
- **High Portability** ✅ Maintained lightweight design
- **No Breaking Changes** ✅ All existing features work as before

## Recommendations for Future Minimization

If further minimization is desired, consider:

1. **Content Collections (272 lines)** - Could be made optional or extracted to a plugin
   - Adds markdown parsing and frontmatter support
   - Requires `marked` dependency
   - Used in examples but not core to basic SSG functionality

2. **Dynamic Routes** - Could be simplified or made optional
   - Adds complexity to builder.js
   - Implements `[slug].jsx` pattern
   - Not needed for simple static sites

However, these are documented features that users may depend on, so removing them would be breaking changes.
