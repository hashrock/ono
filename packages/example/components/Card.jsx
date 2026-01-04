function Card(props) {
  const baseClass = props.hoverable ? "card-hover" : "card";

  return (
    <div class={baseClass}>
      {props.icon && (
        <div class="text-3xl mb-4">{props.icon}</div>
      )}
      {props.title && (
        <h3 class="text-lg font-semibold text-gray-900 mt-0 mb-2">
          {props.title}
        </h3>
      )}
      <div class="text-gray-600">
        {props.children}
      </div>
      {props.actions && (
        <div class="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          {props.actions}
        </div>
      )}
    </div>
  );
}

export default Card;
