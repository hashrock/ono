export const meta = {
  title: "Hello World",
  date: "2025-01-04",
  author: "hashrock",
};

export default function HelloWorld() {
  return (
    <article>
      <h1>{meta.title}</h1>
      <p class="text-gray-500">{meta.date} by {meta.author}</p>
      <p>Welcome to my first blog post built with Ono SSG!</p>
      <p>This is a simple example of using barrels for content management.</p>
    </article>
  );
}
