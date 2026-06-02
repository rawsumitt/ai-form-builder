// wraps the generated component in a standalone HTML file
// uses CDN for React + Tailwind so it works without any build step
export const buildHtml = (code) => {
    if (!code) return ""

    // </script> inside the code would break the host script tag
    const safeCode = code.replace(/<\/script>/gi, "<\\/script>")

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Generated Form</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    body { padding: 24px; background: #f9fafb; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${safeCode}

      // support both a named export and a default export
      const _Component =
        typeof GeneratedForm !== "undefined"
          ? GeneratedForm
          : typeof exports !== "undefined" && exports.default
          ? exports.default
          : null;

      if (_Component) {
        const root = ReactDOM.createRoot(document.getElementById("root"));
        root.render(React.createElement(_Component));
      } else {
        document.getElementById("root").innerHTML =
          '<p style="color:#ef4444;font-size:14px;">⚠️ Could not find a GeneratedForm component. Please regenerate.</p>';
      }
    } catch (err) {
      document.getElementById("root").innerHTML =
        '<div style="color:#ef4444;font-size:14px;white-space:pre-wrap;">' +
        "<strong>Preview Error:</strong><br/>" + err.message + "</div>";
    }
  <\/script>
</body>
</html>`
}
