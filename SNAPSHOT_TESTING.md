# Snapshot Testing Guide

This project uses snapshot testing to ensure consistent output across different components of the Ono SSG framework.

## What is Snapshot Testing?

Snapshot testing captures the output of your code at a specific point in time and stores it as a "snapshot" file. Future test runs compare the current output against the stored snapshot to detect unexpected changes.

## Available Snapshot Tests

### 1. HTML Renderer Snapshots (`test/renderer.snapshot.test.js`)
Tests the HTML output from JSX elements to ensure consistent rendering:
- Simple elements
- Elements with attributes
- Nested structures
- Component functions
- Boolean attributes
- Style objects
- Complex forms
- HTML entity escaping

### 2. JSX Transformer Snapshots (`test/transformer.snapshot.test.js`)
Tests the JavaScript code generated from JSX transformation:
- Simple JSX elements
- JSX with props
- Nested JSX structures
- Component functions
- JSX with expressions
- Self-closing tags
- JSX fragments
- Complex components with imports
- Style prop objects
- Conditional rendering

### 3. UnoCSS Generation Snapshots (`test/unocss.snapshot.test.js`)
Tests the CSS output generated from HTML content:
- Basic utility classes
- Layout classes
- Responsive design
- Color utilities
- Spacing and sizing
- Typography
- Form elements
- Blog layout

## Running Snapshot Tests

### Run all snapshot tests
```bash
npm run test:snapshot
```

### Update snapshots when intentional changes are made
```bash
npm run test:snapshot:update
```

### Run all tests (regular + snapshot)
```bash
npm run test:all
```

## Snapshot Files

Snapshot files are stored in `test/__snapshots__/` with the naming convention:
```
{test-file-name}.{test-name}.snap
```

For example:
- `renderer.snapshot.simple_element.snap`
- `transformer.snapshot.JSX_with_props.snap`
- `unocss.snapshot.basic_utility_classes.snap`

## When to Update Snapshots

Update snapshots when you've intentionally changed:

1. **HTML Output**: Modified the renderer logic
2. **JSX Transformation**: Updated the JSX-to-JS transformation
3. **CSS Generation**: Changed UnoCSS configuration or generation logic

### ⚠️ Important: Review Changes Before Updating

Always review the differences between old and new snapshots before updating:

1. Run tests to see failures
2. Manually verify the changes are intentional
3. Update snapshots using `npm run test:snapshot:update`

## Example Workflow

### Adding a New Feature
1. Write your code
2. Add/modify snapshot tests if needed
3. Run `npm run test:snapshot`
4. If snapshots fail due to intentional changes:
   - Review the changes carefully
   - Run `npm run test:snapshot:update`
   - Commit both code and snapshot changes

### Debugging Snapshot Failures
When snapshot tests fail:

1. **Check the console output** - it shows expected vs actual
2. **Verify if the change was intentional**:
   - If yes: update snapshots
   - If no: fix your code
3. **For complex diffs**, you can examine snapshot files directly

## Best Practices

1. **Keep snapshots small and focused** - Test specific functionality
2. **Review snapshot changes in PRs** - Don't blindly update snapshots
3. **Use descriptive test names** - Makes snapshot files easier to understand
4. **Commit snapshot files** - They're part of your test suite
5. **Regular cleanup** - Remove unused snapshot files

## Custom Snapshot Utilities

The project includes custom snapshot utilities in `test/snapshot-utils.js`:

- `matchSnapshot()` - Generic snapshot matching
- `matchHTMLSnapshot()` - HTML-specific formatting
- `matchCodeSnapshot()` - JavaScript code formatting

### Example Usage

```javascript
import { matchHTMLSnapshot } from "./snapshot-utils.js";

test("my html test", async () => {
  const html = renderComponent();
  await matchHTMLSnapshot(html, "my-test-file.js", "my html test");
});
```

## Troubleshooting

### Snapshot test fails with "No such file or directory"
- Make sure you're running tests from the project root
- Ensure `test/__snapshots__/` directory exists (it's created automatically)

### Snapshots not updating
- Use the exact command: `npm run test:snapshot:update`
- Check file permissions on the `test/__snapshots__/` directory

### Large snapshot diffs
- Consider breaking down large components into smaller, testable units
- Use more specific test names to identify which part changed

---

**Note**: Snapshot testing complements, but doesn't replace, traditional unit tests. Use both approaches for comprehensive test coverage.