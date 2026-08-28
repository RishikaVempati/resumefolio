/**
 * The templates a user can pick. One place, so the landing gallery and the
 * preview switcher cannot drift apart.
 *
 * They render identical content — the difference is layout and type. Classic is
 * one centred serif column; Modern is a two-column grid with an accent rule.
 */
export const TEMPLATES = [
  {
    id: "modern",
    name: "Modern",
    blurb: "Two columns, sans-serif, an accent rule under each heading.",
  },
  {
    id: "classic",
    name: "Classic",
    blurb: "One centred column, serif headings, generous margins.",
  },
];

export const DEFAULT_TEMPLATE = "modern";
