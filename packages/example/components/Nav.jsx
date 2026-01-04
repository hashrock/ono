function Nav() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/about.html", label: "About" },
    { href: "/features.html", label: "Features" },
  ];

  return (
    <header class="bg-white border-b border-gray-200">
      <nav class="container flex items-center justify-between h-16">
        <a href="/" class="text-xl font-bold text-primary-600 no-underline">
          Ono Example
        </a>
        <ul class="flex gap-6 list-none m-0 p-0">
          {links.map((link) => (
            <li>
              <a href={link.href} class="nav-link no-underline font-medium">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default Nav;
