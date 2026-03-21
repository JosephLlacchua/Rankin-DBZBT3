/* Shared Constants */

const RANKS = [
    { name: "E", min: 0, max: 699, class: "rank-E" },
    { name: "D", min: 700, max: 999, class: "rank-D" },
    { name: "C", min: 1000, max: 1299, class: "rank-C" },
    { name: "B", min: 1300, max: 1599, class: "rank-B" },
    { name: "A", min: 1600, max: 1899, class: "rank-A" },
    { name: "S", min: 1900, max: Infinity, class: "rank-S" }
];

const PAGE_SIZE = 10;

/* Códigos ISO 2 letras → flagcdn.com */
const BANDERAS = {
    "ARGENTINA": "ar",
    "PERÚ":      "pe",
    "PERU":      "pe",
    "PARAGUAY":  "py",
    "CHILE":     "cl",
    "URUGUAY":   "uy",
    "BRASIL":    "br",
    "VENEZUELA": "ve",
    "COLOMBIA":  "co",
    "BOLIVIA":   "bo"
};
