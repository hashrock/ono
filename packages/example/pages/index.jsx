import Layout from "../components/Layout.jsx";
import Hero from "../components/Hero.jsx";
import Button from "../components/Button.jsx";
import FeatureGrid from "../components/FeatureGrid.jsx";

const features = [
  {
    icon: "⚡",
    title: "Fast & Minimal",
    description: "Built on TypeScript's JSX transform. No heavy build tools required.",
  },
  {
    icon: "🎨",
    title: "UnoCSS Integration",
    description: "Atomic CSS utilities out of the box. Just use classes and they're generated automatically.",
  },
  {
    icon: "🧩",
    title: "Component-Based",
    description: "Create reusable components with JSX. Layouts, cards, buttons - compose them freely.",
  },
  {
    icon: "📦",
    title: "Zero Config",
    description: "Works out of the box. Add uno.config.js only when you need customization.",
  },
  {
    icon: "🔥",
    title: "Hot Reload",
    description: "Development server with live reload. See your changes instantly.",
  },
  {
    icon: "🌐",
    title: "Static Output",
    description: "Generates pure HTML files. Deploy anywhere - no server required.",
  },
];

function App() {
  return (
    <Layout title="Ono Example - Modern SSG with UnoCSS">
      <Hero
        title="Build Beautiful Static Sites"
        subtitle="This example showcases Ono's features: UnoCSS integration, reusable layouts, and component-based architecture."
      >
        <div class="flex gap-4 justify-center">
          <Button variant="primary" size="lg">Get Started</Button>
          <Button variant="secondary" size="lg">View on GitHub</Button>
        </div>
      </Hero>

      <section class="section">
        <h2 class="text-2xl font-bold text-center mb-8">Features</h2>
        <FeatureGrid features={features} />
      </section>

      <section class="section bg-white rounded-2xl p-8 mt-8">
        <h2 class="text-2xl font-bold mb-4">Quick Example</h2>
        <p class="text-gray-600 mb-4">
          Creating a component with UnoCSS is simple:
        </p>
        <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <code>{`function Card(props) {
  return (
    <div class="bg-white rounded-xl shadow-md p-6">
      <h3 class="text-lg font-semibold">{props.title}</h3>
      <p class="text-gray-600">{props.children}</p>
    </div>
  );
}`}</code>
        </pre>
      </section>
    </Layout>
  );
}

export default App;
