// Layout component with slot support
function Layout(props) {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title || "Mini JSX Site"}</title>
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
        `}</style>
      </head>
      <body>
        <header>
          <h1>{props.title}</h1>
          {props.header}
        </header>
        <main>
          {props.children}
        </main>
        <footer>
          {props.footer || <p>© 2025 Mini JSX</p>}
        </footer>
      </body>
    </html>
  );
}

export default Layout;
