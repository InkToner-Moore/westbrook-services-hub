const drawings = {
  cartridge: [
    "M20 34 L32 24 H57 L64 32 H76 V66 L64 76 H24 Q20 76 20 72 Z",
    "M20 34 H56 L64 42 H76 M64 42 V76",
    "M32 24 V34 M57 24 V35",
    "M28 44 H55 V62 H28 Z",
    "M28 68 H55 V72 H28 Z",
  ],
  drop: [
    "M40 14 C35 28 18 43 18 58 A22 22 0 0 0 62 58 C62 43 45 28 40 14 Z",
    "M28 54 C25 62 30 69 37 71",
    "M74 44 C71 51 66 57 66 63 A8 8 0 0 0 82 63 C82 57 77 51 74 44 Z",
    "M71 62 Q70 66 74 68",
  ],
  key: [
    "M31 32 A16 16 0 1 0 31 64 A16 16 0 1 0 31 32 Z",
    "M29 42 A6 6 0 1 0 29 54 A6 6 0 1 0 29 42 Z",
    "M46 42 H51 L55 38 H77 L83 48 L78 58 H74 L71 51 L68 58 H65 L62 53 L59 58 H56 L53 51 L50 58 H47 L44 54",
    "M54 43 H75",
  ],
  parcel: [
    "M16 32 L48 15 L80 32 V65 L48 82 L16 65 Z",
    "M16 32 L48 49 L80 32 M48 49 V82",
    "M29 25 L61 42 V53 L69 49 V38 L37 21",
    "M24 46 L39 54 V67 L24 59 Z",
    "M28 54 L35 58",
  ],
};

const ServiceArt = ({ kind }: { kind: "cartridge" | "drop" | "key" | "parcel" }) => {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-full w-full"
    >
      <g transform={kind === "key" ? "rotate(30 48 48)" : undefined}>
        {drawings[kind].map((d, index) => (
          <path key={index} d={d} pathLength="1" className="pub-draw" />
        ))}
      </g>
    </svg>
  );
};

export default ServiceArt;
