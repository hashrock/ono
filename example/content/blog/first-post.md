---
title: My First Blog Post
date: 2024-01-15
author: John Doe
tags:
  - javascript
  - web
  - tutorial
draft: false
---

# Welcome to My Blog

This is my first blog post using **Ono's Content Collections**!

## Features

Content Collections in Ono provide:

- Frontmatter parsing
- Markdown to HTML conversion
- Type validation
- Easy querying with `getCollection()` and `getEntry()`

## Code Example

Here's a simple example:

```javascript
import { getCollection } from '@hashrock/ono/content';

const posts = await getCollection('blog');
```

## Conclusion

Building static sites with Ono is simple and lightweight!
