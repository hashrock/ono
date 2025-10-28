// Simple Button component
function Button(props) {
  return (
    <button style={{
      padding: "0.5rem 1rem",
      backgroundColor: props.primary ? "#007bff" : "#6c757d",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "1rem"
    }}>
      {props.children}
    </button>
  );
}

export default Button;
