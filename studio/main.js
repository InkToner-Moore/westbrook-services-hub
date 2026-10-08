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
