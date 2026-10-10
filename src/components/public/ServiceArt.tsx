import { drawings } from "./serviceDrawings";

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
