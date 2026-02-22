import { createSignal } from "solid-js";

// jsx-no-script-url
function BadLink() {
  return <a href="javascript:alert(1)">Click me</a>;
}

// no-react-specific-props (className instead of class)
function ReactStyle() {
  return <div className="container">Hello</div>;
}

// no-innerhtml (dynamic value — not statically analyzable)
function Dangerous() {
  const html = getHtml();
  return <div innerHTML={html} />;
}

// no-destructure (destructuring props breaks reactivity)
function Broken({ name, count }: { name: string; count: number }) {
  return <div>{name}: {count}</div>;
}
