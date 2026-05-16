const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="test-slider">
  <div class="item">Item 0</div>
  <div class="item">Item 1</div>
  <div class="item">Item 2</div>
  <div class="item">Item 3</div>
  <div class="item">Item 4</div>
  <div class="item">Item 5</div>
  <div class="item">Item 6</div>
  <div class="item">Item 7</div>
</div></body></html>`, { runScripts: "dangerously" });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const jqueryCode = fs.readFileSync(path.join(__dirname, "../../src/renderer/vendor/jquery.min.js"), "utf8");
dom.window.eval(jqueryCode);
global.$ = dom.window.$;
global.jQuery = dom.window.jQuery;

const slickCode = fs.readFileSync(path.join(__dirname, "../../src/renderer/vendor/slick.min.js"), "utf8");
dom.window.eval(slickCode);

const el = dom.window.$("#test-slider");
el.slick({
  dots: false,
  arrows: false,
  infinite: false,
  slidesToShow: 6,
  slidesToScroll: 1,
  speed: 150,
  waitForAnimate: false,
});

console.log("Initial currentSlide:", el[0].slick.currentSlide);
el[0].slick.next();
console.log("After next(), currentSlide:", el[0].slick.currentSlide);
el[0].slick.prev();
console.log("After prev(), currentSlide:", el[0].slick.currentSlide);
el[0].slick.prev();
console.log("After second prev(), currentSlide:", el[0].slick.currentSlide);
