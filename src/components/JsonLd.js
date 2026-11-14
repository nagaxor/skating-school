// Server component: renders schema.org JSON-LD. `<` is escaped so data can
// never close the script tag (no HTML/script injection via DB content).
export default function JsonLd({ data }) {
  const items = Array.isArray(data) ? data : [data];
  return items.map((d, i) => (
    <script
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }}
    />
  ));
}
