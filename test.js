const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('src/index.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  console.error("jsdomError:", error.stack, error.detail);
});
virtualConsole.on("log", (...message) => {
  console.log("log:", ...message);
});
virtualConsole.on("error", (...message) => {
  console.log("error:", ...message);
});
virtualConsole.on("warn", (...message) => {
  console.log("warn:", ...message);
});

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost:8081/",
  virtualConsole,
  beforeParse(window) {
    window.requestAnimationFrame = cb => setTimeout(cb, 16);
  }
});
setTimeout(() => {
    console.log("Done waiting");
    process.exit(0);
}, 3000);
