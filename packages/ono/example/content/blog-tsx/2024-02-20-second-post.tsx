import { Markdown } from "@hashrock/ono/blog";

export const meta = {
  slug: "second-post",
  title: "Advanced Hybrid Patterns",
  date: new Date("2024-02-20"),
  author: "Jane Smith",
  tags: ["typescript", "patterns", "ono"],
};

// You can define custom components in the same file
function CodeDemo({ language, children }) {
  return (
    <div class="border rounded overflow-hidden my-4">
      <div class="bg-gray-800 text-white px-3 py-1 text-sm">{language}</div>
      <pre class="bg-gray-900 text-green-400 p-4 overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Alert({ type = "info", children }) {
  const colors = {
    info: "bg-blue-100 border-blue-500 text-blue-700",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-700",
    success: "bg-green-100 border-green-500 text-green-700",
  };

  return (
    <div class={`border-l-4 p-4 my-4 ${colors[type]}`}>
      {children}
    </div>
  );
}

export default function Content() {
  return (
    <>
      <Markdown>{`
# Advanced Hybrid Patterns

The Hybrid approach unlocks powerful patterns for technical writing.
      `}</Markdown>

      <Alert type="info">
        <strong>Tip:</strong> You can create reusable components right in your post file!
      </Alert>

      <Markdown>{`
## Custom Code Blocks

Instead of using markdown code blocks, you can create interactive demos:
      `}</Markdown>

      <CodeDemo language="TypeScript">
{`interface PostMeta {
  slug: string;
  title: string;
  date: Date;
  tags: string[];
}

export const meta: PostMeta = {
  slug: "my-post",
  title: "Hello World",
  date: new Date(),
  tags: ["example"],
};`}
      </CodeDemo>

      <Alert type="success">
        <strong>Result:</strong> Full TypeScript support with IDE autocompletion!
      </Alert>

      <Markdown>{`
## Why Hybrid?

| Feature | Markdown Only | TSX Only | Hybrid |
|---------|--------------|----------|--------|
| Easy writing | Yes | No | Yes |
| Type safety | No | Yes | Yes |
| Custom components | No | Yes | Yes |
| IDE support | Limited | Full | Full |

## Conclusion

The Hybrid approach gives you the best of both worlds!
      `}</Markdown>
    </>
  );
}
