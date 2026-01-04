import Button from "./Button.jsx";

function Card(props) {
  return (
    <div>
      <h3>{props.title}</h3>
      <Button>Click me</Button>
    </div>
  );
}

export default Card;
