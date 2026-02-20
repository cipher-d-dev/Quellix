const baseHTMLResponse = `
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Quellix API</title>
        <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
        />
        <link rel="shortcut icon" href="https://github.com/cipher-d-dev/Quellix/blob/94961e37b74d844f31bba64b55f1f6c26c44b50c/apps/api/public/assets/favicon-solid.png" type="image/x-icon">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: "Inter", sans-serif !important;
            background: #0a0e27;
            color: #e0e6ed;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: #131829;
            border: 1px solid #1e2749;
            border-radius: 12px;
            padding: 50px;
            max-width: 700px;
            width: 100%;
            text-align: center;
        }
        .welcome {
            color: #8b92a5;
            font-size: 13px;
            margin-bottom: 12px;
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
        }
        .version {
            color: #8b92a5;
            font-size: 13px;
            margin-bottom: 24px;
        }
        .status {
            color: #00d084;
            font-weight: 500;
            margin: 24px 0;
            font-size: 14px;
        }
        .endpoints {
            text-align: left;
            background: #0a0e27;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
            border: 1px solid #1e2749;
        }
        .endpoints p {
            margin: 6px 0;
            color: #c0c5d0;
            font-size: 13px;
        }
        .endpoints strong {
            color: #e0e6ed;
        }
        code {
            background: #1e2749;
            color: #00d084;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: "Courier New", monospace;
            font-size: 12px;
        }
        .github-link {
            margin-top: 32px;
        }
        .github-link a {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #00d084;
            text-decoration: none;
            font-size: 13px;
            padding: 8px 16px;
            border: 1px solid #00d084;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .github-link a:hover {
            background: #00d084;
            color: #0a0e27;
        }
        </style>
    </head>
    <body>
        <div class="container">
        <p class="welcome">Welcome to the</p>
        <h1>Quellix API</h1>
        <p class="version">v1.0.0</p>
        <p class="status">● Running</p>
        <div class="endpoints">
            <p><strong>Endpoints:</strong></p>
            <p><code>/api/auth</code></p>
        </div>
        <div class="github-link">
            <a href="https://github.com/cipher-d-dev/quellix" target="_blank">
            → GitHub
            </a>
        </div>
        </div>
    </body>
    </html>
`;

export { baseHTMLResponse };