// External imports
import Layout from "./components/Layout.jsx";
import Card from "./components/Card.jsx";
import Button from "./components/Button.jsx";

// Simple component
function Greeting(props) {
  return <div>Hello, {props.name}!</div>;
}

// Main page demonstrating slots and external imports
function App() {
  return (
    <Layout
      title="Mini JSX - SSG Example"
      header={
        <nav>
          <a href="/">Home</a> | <a href="/about">About</a>
        </nav>
      }
      footer={
        <div>
          <p>Built with Mini JSX 🚀</p>
          <p style={{ fontSize: "0.9rem" }}>A lightweight JSX library for static site generation</p>
        </div>
      }
    >
      <Greeting name="World" />

      <p>This example demonstrates:</p>
      <ul>
        <li>External component imports</li>
        <li>Slot-based composition (children, header, footer, actions)</li>
        <li>Props handling</li>
        <li>Nested components</li>
      </ul>

      <Card
        title="Feature: Slots"
        actions={
          <div>
            <Button primary>Learn More</Button>
            <Button>Skip</Button>
          </div>
        }
      >
        <p>
          Cards can have title slots, content slots (children),
          and action slots for flexible composition.
        </p>
      </Card>

      <Card title="Feature: External Imports">
        <p>
          Import components from separate files to keep your code organized.
          The build system will resolve and bundle them automatically.
        </p>
      </Card>

      <Card>
        <p>
          <strong>No title?</strong> No problem! Slots are optional.
        </p>
      </Card>
    </Layout>
  );
}

export default App;
