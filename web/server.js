const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5500;
const HOST = "127.0.0.1";

const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
    let requestedPath = decodeURIComponent(req.url.split("?")[0]);

    if (requestedPath === "/") {
        requestedPath = "/index.html";
    }

    const filePath = path.join(__dirname, requestedPath);

    // Prevent accessing files outside the project folder
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end("403 Forbidden");
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (!error && stats.isDirectory()) {
            const indexPath = path.join(filePath, "index.html");

            fs.readFile(indexPath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end("404 Not Found");
                    return;
                }

                res.writeHead(200, {
                    "Content-Type": "text/html"
                });

                res.end(data);
            });

            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, {
                    "Content-Type": "text/plain"
                });

                res.end("404 - File Not Found");
                return;
            }

            const extension = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[extension] || "application/octet-stream";

            res.writeHead(200, {
                "Content-Type": contentType
            });

            res.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`DataCare server running at http://${HOST}:${PORT}`);
});