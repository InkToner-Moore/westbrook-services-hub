// Contact details live here. The same values are repeated in index.html as
// fallbacks for when scripts are off, so change both.
const CONTACT = {
  email: "hi@parsaj.dev",
  phone: "403-686-2835",
  phoneHref: "tel:4036862835",
  place: "Ink, Toner & Moore, Westbrook Mall, Calgary",
};

document.querySelectorAll("[data-contact]").forEach((element) => {
  const key = element.dataset.contact;
  const value = element.querySelector(".contact-value") || element;
  value.textContent = CONTACT[key];
  element.href = key === "email" ? `mailto:${CONTACT.email}`
    : key === "phone" ? CONTACT.phoneHref
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.place)}`;
});
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// The headline is printed the way the shop prints: a cyan, a magenta and a
// yellow plate laid over each other. In register they make black. They start
// out of register, settle on load, and drift apart again with the pointer and
// as the headline scrolls away.
const headline = document.querySelector(".plates");
const canBlend = window.CSS && CSS.supports("mix-blend-mode", "multiply");
if (headline && canBlend) {
  const source = headline.querySelector(".plates-text");
  const plates = [
    { name: "c", x: -1, y: -0.55, pull: -1 },
    { name: "m", x: 0.9, y: 0.35, pull: 1 },
    { name: "y", x: 0.2, y: 0.85, pull: 0.5 },
  ].map((plate) => {
    const layer = document.createElement("span");
    layer.className = `plate plate-${plate.name}`;
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = source.innerHTML;
    headline.appendChild(layer);
    return { ...plate, layer };
  });
  headline.classList.add("is-printing");

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const place = (spread, px, py) => {
    plates.forEach((plate) => {
      const x = plate.x * spread + px * plate.pull;
      const y = plate.y * spread + py * plate.pull;
      plate.layer.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    });
  };

  if (still) {
    place(0, 0, 0);
  } else {
    const SETTLE_MS = 1500;
    const START_SPREAD = 26;
    const SCROLL_SPREAD = 30;
    const POINTER_PULL = 7;
    let start = null;
    let visible = true;
    let frame = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const tick = (now) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / SETTLE_MS, 1);
      const settle = START_SPREAD * Math.pow(1 - t, 4);
      const box = headline.getBoundingClientRect();
      const gone = Math.min(Math.max(-box.top / Math.max(box.height, 1), 0), 1);
      pointer.x += (pointer.tx - pointer.x) * 0.09;
      pointer.y += (pointer.ty - pointer.y) * 0.09;
      place(settle + gone * SCROLL_SPREAD, pointer.x * POINTER_PULL, pointer.y * POINTER_PULL);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };

    place(START_SPREAD, 0, 0);
    const begin = () => { frame = requestAnimationFrame(tick); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(begin);

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => {
      pointer.tx = 0;
      pointer.ty = 0;
    });

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame && start !== null) frame = requestAnimationFrame(tick);
    }).observe(headline);
  }
}
