import Layout from "../components/Layout.jsx";
import { entries, posts } from "../barrels/blog.ts";

function Blog() {
  return (
    <Layout title="Blog - Ono Example">
      <h1 class="text-3xl font-bold mb-2">Blog</h1>
      <p class="text-gray-600 mb-8">
        Posts under <code>barrels/blog/</code> are collected into an
        auto-generated barrel file with typed metadata.
      </p>

      <div class="space-y-8">
        {entries.map((id) => {
          const { component: Post, meta } = posts[id];
          return (
            <section class="card">
              {meta && (
                <p class="text-xs uppercase tracking-wide text-primary-600 mb-2">
                  {meta.date}
                </p>
              )}
              <Post />
            </section>
          );
        })}
      </div>
    </Layout>
  );
}

export default Blog;
