// Card component demonstrating slots
function Card(props) {
  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "1.5rem",
      marginBottom: "1rem",
      backgroundColor: "#f9f9f9"
    }}>
      {props.title && (
        <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      )}
      <div>
        {props.children}
      </div>
      {props.actions && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #ddd" }}>
          {props.actions}
        </div>
      )}
    </div>
  );
}

export default Card;
