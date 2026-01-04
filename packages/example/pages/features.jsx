import Layout from "../components/Layout.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";

function Features() {
  return (
    <Layout title="Features - Ono Example">
      <h1 class="text-3xl font-bold mb-2">Features</h1>
      <p class="text-gray-600 mb-8">
        Explore what you can build with Ono and UnoCSS.
      </p>

      {/* Buttons Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">Buttons</h2>
        <Card>
          <div class="flex flex-wrap gap-4 mb-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
          </div>
          <div class="flex flex-wrap gap-4">
            <Button variant="primary" size="lg">Large Primary</Button>
            <Button variant="secondary" size="lg">Large Secondary</Button>
          </div>
        </Card>
      </section>

      {/* Cards Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">Cards</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <Card title="Basic Card">
            A simple card with just a title and content.
          </Card>
          <Card icon="🚀" title="Card with Icon">
            Cards can have icons to add visual interest.
          </Card>
          <Card
            title="Card with Actions"
            actions={[
              <Button variant="primary">Action</Button>,
              <Button variant="secondary">Cancel</Button>
            ]}
          >
            Cards can include action buttons.
          </Card>
        </div>
      </section>

      {/* Hover Cards Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">Hover Effects</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <Card title="Hover Card 1" hoverable>
            Hover over this card to see the shadow effect.
          </Card>
          <Card title="Hover Card 2" hoverable>
            Great for interactive elements and links.
          </Card>
          <Card title="Hover Card 3" hoverable>
            Subtle but effective user feedback.
          </Card>
        </div>
      </section>

      {/* Typography Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">Typography</h2>
        <Card>
          <div class="space-y-4">
            <h1 class="text-4xl font-bold">Heading 1</h1>
            <h2 class="text-3xl font-bold">Heading 2</h2>
            <h3 class="text-2xl font-semibold">Heading 3</h3>
            <h4 class="text-xl font-semibold">Heading 4</h4>
            <p class="text-base">Regular paragraph text with <strong>bold</strong> and <em>italic</em> styles.</p>
            <p class="text-sm text-gray-600">Small muted text for secondary information.</p>
          </div>
        </Card>
      </section>

      {/* Colors Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">Colors</h2>
        <Card>
          <h3 class="text-lg font-semibold mb-3">Primary Palette</h3>
          <div class="flex gap-2 mb-4">
            <div class="w-12 h-12 bg-primary-50 rounded" title="primary-50"></div>
            <div class="w-12 h-12 bg-primary-100 rounded" title="primary-100"></div>
            <div class="w-12 h-12 bg-primary-200 rounded" title="primary-200"></div>
            <div class="w-12 h-12 bg-primary-300 rounded" title="primary-300"></div>
            <div class="w-12 h-12 bg-primary-400 rounded" title="primary-400"></div>
            <div class="w-12 h-12 bg-primary-500 rounded" title="primary-500"></div>
            <div class="w-12 h-12 bg-primary-600 rounded" title="primary-600"></div>
            <div class="w-12 h-12 bg-primary-700 rounded" title="primary-700"></div>
            <div class="w-12 h-12 bg-primary-800 rounded" title="primary-800"></div>
            <div class="w-12 h-12 bg-primary-900 rounded" title="primary-900"></div>
          </div>
          <h3 class="text-lg font-semibold mb-3">Accent</h3>
          <div class="flex gap-2">
            <div class="w-12 h-12 bg-accent-light rounded" title="accent-light"></div>
            <div class="w-12 h-12 bg-accent rounded" title="accent"></div>
            <div class="w-12 h-12 bg-accent-dark rounded" title="accent-dark"></div>
          </div>
        </Card>
      </section>

      {/* Grid Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">Responsive Grid</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div class="bg-primary-100 text-primary-800 p-4 rounded-lg text-center font-medium">
              Item {i}
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}

export default Features;
