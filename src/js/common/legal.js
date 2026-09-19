import * as dom from "#common/dom";
import * as i18n from "#common/i18n";
import drawer from "#common/drawer";
import * as route from "#common/route";
import terms from "../../terms.html?raw";
import privacy from "../../privacy.html?raw";
import "../../css/legal.css";

export default async function legal(name) {
  const source = { terms, privacy }[name];

  if (!source) return false;
  const page = new DOMParser().parseFromString(source, "text/html");
  const content = page.querySelector(".legal");
  const sections = new Map(
    [...content.querySelectorAll("[id]")].map((element) => [element.id, element])
  );

  content.querySelector("h1")?.remove();
  content.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));

  dom.on(content, "click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (link) {
      event.preventDefault();
      sections.get(link.hash.slice(1))?.scrollIntoView({ block: "start" });
    }
  });

  i18n.preload(
    ...[...content.querySelectorAll("[data-i18n]")].map((element) => dom.get(element, "data-i18n"))
  );

  return drawer({
    route: [name, ""],
    title: `${name}.title`,
    content,
    back: true,
    side: "right",
    direction: "→"
  });
}

for (const name of ["terms", "privacy"]) route.register(name, () => legal(name), "drawer");
