function Button(props) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
  };

  const variantClass = variants[props.variant] || variants.primary;
  const sizeClass = props.size === "lg" ? "text-lg px-6 py-3" : "";

  return (
    <button class={`${variantClass} ${sizeClass}`}>
      {props.children}
    </button>
  );
}

export default Button;
