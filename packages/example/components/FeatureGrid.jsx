import Card from "./Card.jsx";

function FeatureGrid(props) {
  return (
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {props.features.map((feature) => (
        <Card icon={feature.icon} title={feature.title} hoverable>
          {feature.description}
        </Card>
      ))}
    </div>
  );
}

export default FeatureGrid;
