import Layout from "../components/Layout.jsx";
import Card from "../components/Card.jsx";

function About() {
  return (
    <Layout title="About - Ono Example">
      <h1 class="text-3xl font-bold mb-6">About This Example</h1>

      <div class="prose max-w-none">
        <p class="text-lg text-gray-600 mb-8">
          This example site demonstrates how to build a modern static site using Ono with UnoCSS,
          reusable layouts, and component-based architecture.
        </p>

        <div class="grid md:grid-cols-2 gap-6 mb-8">
          <Card title="Project Structure">
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li><code>components/</code> - Reusable UI components</li>
              <li><code>pages/</code> - Page components</li>
              <li><code>uno.config.js</code> - UnoCSS configuration</li>
              <li><code>package.json</code> - Project dependencies</li>
            </ul>
          </Card>

          <Card title="Key Technologies">
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li><strong>Ono</strong> - Minimal JSX SSG framework</li>
              <li><strong>UnoCSS</strong> - Atomic CSS engine</li>
              <li><strong>JSX</strong> - Component syntax</li>
              <li><strong>TypeScript</strong> - JSX transform</li>
            </ul>
          </Card>
        </div>

        <h2 class="text-2xl font-bold mb-4">Component Architecture</h2>
        <p class="text-gray-600 mb-4">
          This example uses a component-based architecture where:
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-600 mb-8">
          <li><strong>Layout</strong> wraps all pages with consistent header, footer, and styling</li>
          <li><strong>Card</strong> provides a reusable container with optional title, icon, and actions</li>
          <li><strong>Button</strong> supports multiple variants (primary, secondary, accent) and sizes</li>
          <li><strong>Hero</strong> creates prominent page headers with title and call-to-action</li>
          <li><strong>FeatureGrid</strong> displays features in a responsive grid layout</li>
        </ul>

        <h2 class="text-2xl font-bold mb-4">UnoCSS Shortcuts</h2>
        <p class="text-gray-600 mb-4">
          Custom shortcuts defined in <code>uno.config.js</code>:
        </p>
        <div class="bg-gray-100 rounded-lg p-4">
          <code class="text-sm">
            btn, btn-primary, btn-secondary, card, card-hover, container, nav-link, section
          </code>
        </div>
      </div>
    </Layout>
  );
}

export default About;
