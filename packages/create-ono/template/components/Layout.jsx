function Layout(props) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title || "Ono Site"}</title>
        <style>{`
          body {
            font-family: system-ui, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
          }
          header {
            border-bottom: 2px solid #333;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }
          footer {
            border-top: 1px solid #ccc;
            padding-top: 1rem;
            margin-top: 3rem;
            color: #666;
          }
          code {
            background: #f4f4f4;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
          }
        `}</style>
      </head>
      <body>
        <header>
          <h1>{props.title}</h1>
        </header>
        <main>
          {props.children}
        </main>
        <footer>
          <p>Built with Ono</p>
        </footer>
      </body>
    </html>
  );
}

export default Layout;
