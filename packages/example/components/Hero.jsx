import Button from "./Button.jsx";

function Hero(props) {
  return (
    <section class="py-16 md:py-24 text-center">
      <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        {props.title}
      </h1>
      {props.subtitle && (
        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {props.subtitle}
        </p>
      )}
      {props.children}
    </section>
  );
}

export default Hero;
