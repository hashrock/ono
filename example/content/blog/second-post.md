---
title: Building with JSX
date: 2024-01-20
author: Jane Smith
tags: [jsx, react, components]
draft: false
---

# Building Static Sites with JSX

JSX provides a powerful way to build static sites with component-based architecture.

## Why JSX?

1. **Familiar syntax** - If you know React, you know JSX
2. **Component reusability** - Build once, use everywhere
3. **Type safety** - Works great with TypeScript

## Example Component

```jsx
function BlogPost({ title, date, children }) {
  return (
    <article>
      <h1>{title}</h1>
      <time>{date}</time>
      <div>{children}</div>
    </article>
  );
}
```

That's all for today!
