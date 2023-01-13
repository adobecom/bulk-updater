import htm from './htm.js';
let i = 0;

function createEl(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    Object.entries(props).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  if (children.length) el.append(...children);
  return el;
}

const yell = () => console.log('AAAAAAAAAAAAAAAAAA');

const h = htm.bind(createEl);
console.log('----------------------------------------------------------------')
// window.l = h`<div><h2 id=hello>Hello world!</h2><div class="mytest" data-check=true>tests</div></div>`;
window.l = h`<main>
<div class="section xl-spacing"><div class="content"><h1 id="about">About</h1><p>Milo is fast. Milo is seamless. Milo is obvious. Milo is punk rock. Milo is chaotic good.</p><div onClick=${yell}>Click ME</div><p>A chaotic good character acts as their conscience directs them with little regard for what others expect of them. They make their own way, but they’re kind and benevolent. They believe in goodness and right but have little use for laws and regulations. They hate when people try to intimidate others and tell them what to do. They follow their own moral compass, which, although good, may not agree with that of society.</p><p>Chaotic good is the best alignment you can be because it combines a good heart with a free spirit.</p><p>What is Milo’s favorite color? Pink.</p></div>





  <div class="section-metadata">
    <div>
      <div data-valign="middle">style</div>
      <div data-valign="middle">xl spacing</div>
    </div>
  </div>
</div>
<div class="section xl-spacing" style="background-color: rgb(240, 240, 240);"><div class="content"><h2 id="team-principles">Team Principles</h2><ol>
    <li>Our team is a meritocracy.</li>
    <li>We’re all engineers. We are all QEs.</li>
    <li>The best idea wins. Not most clever. Not most amount of code. It is the clearest idea conveyed that can be understood by most.</li>
    <li>Anyone can tell anyone no, including managers.</li>
    <li>We share early, and we share often. We fail fast.</li>
    <li>We encourage being dumb. We ask lots of questions until we have clarity of vision.</li>
    <li>We do iteration over waterfalls. We don’t over-engineer before we need to.</li>
    <li>We remember the past, but won't just build it again. We’re not here to build Dexter or AEM.</li>
    <li>We build with empathy. Everyone meets with stakeholders.</li>
    <li>Everyone has the heart of a teacher. Teach, don’t tell. Teach, don’t sell.</li>
    <li>We use our own work. Extensively.</li>
    <li>We have fun... at least we try to.</li>
    <li>We try to follow the <a href="https://www.hlx.live/docs/manifesto">Franklin Manifesto</a> as much as possible.</li>
  </ol></div>


  <div class="section-metadata">
    <div>
      <div data-valign="middle">style</div>
      <div data-valign="middle">xl spacing</div>
    </div>
    <div>
      <div data-valign="middle">background</div>
      <div data-valign="middle">#f0f0f0</div>
    </div>
  </div>
</div>
<div class="section"></div>
</main>`;
