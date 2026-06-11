const http = require("http"), fs = require("fs"), path = require("path"), url = require("url");
const dir = "D:\\NELS\\AlxorFiles052026\\alex\\chatbot";
const srv = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let fp = path.join(dir, parsed.pathname === "/" ? "chatbot_apporteur_v1.html" : parsed.pathname);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end("Not found"); return; }
  const ext = path.extname(fp);
  const ct = {".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png"}[ext] || "application/octet-stream";
  res.writeHead(200, {"Content-Type": ct + "; charset=utf-8"});
  res.end(fs.readFileSync(fp));
});
srv.listen(3003, () => console.log("OK on 3003"));
