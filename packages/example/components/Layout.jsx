import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";

function Layout(props) {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title || "Ono Example"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Inter', system-ui, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }
        `}</style>
      </head>
      <body class="bg-gray-50 text-gray-900">
        <Nav />
        <main class="container py-8">
          {props.children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

export default Layout;
