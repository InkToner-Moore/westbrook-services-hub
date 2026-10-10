import { drawings } from "./serviceDrawings";

type ArtKind = keyof typeof drawings | "tag-ups" | "tag-fedex" | "tag-purolator";

const tags = {
  "tag-ups": { name: "UPS", bars: [44, 48, 53, 59, 62, 68, 73, 77, 83, 88, 92, 98, 104, 108, 114, 119, 125, 130] },
  "tag-fedex": { name: "FedEx", bars: [44, 49, 55, 58, 64, 70, 74, 80, 85, 89, 95, 101, 105, 111, 116, 122, 128, 133] },
  "tag-purolator": { name: "Purolator", bars: [44, 50, 54, 60, 65, 69, 75, 81, 84, 90, 96, 100, 106, 112, 117, 123, 127, 134] },
};

const BackdropArt = ({ kind, className }: { kind: ArtKind; className?: string }) => {
  const tag = kind.startsWith("tag-") ? tags[kind as keyof typeof tags] : null;

  return (
    <svg
      viewBox={tag ? "0 0 168 84" : "0 0 96 96"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {tag ? (
        <>
          <path
            d="M30 2 H158 Q166 2 166 10 V74 Q166 82 158 82 H30 Q27 82 25 79 L4 48 Q0 42 4 36 L25 5 Q27 2 30 2 Z"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="19" cy="42" r="5" vectorEffect="non-scaling-stroke" />
          <path d="M19 42 C7 27 -8 26 -8 35 C-8 44 7 49 19 42" vectorEffect="non-scaling-stroke" />
          <text
            x="44"
            y="38"
            fontFamily={'"IBM Plex Mono", ui-monospace, monospace'}
            fontSize="19"
            fontWeight="600"
            fill="currentColor"
            stroke="none"
            letterSpacing="0.5"
          >
            {tag.name}
          </text>
          {tag.bars.map((x, index) => (
            <path
              key={x}
              d={`M${x} 50 V70`}
              strokeWidth={index % 4 === 1 || index % 7 === 3 ? 3 : 1.25}
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      ) : (
        drawings[kind as keyof typeof drawings].map((d, index) => (
          <path key={index} d={d} vectorEffect="non-scaling-stroke" />
        ))
      )}
    </svg>
  );
};

export default BackdropArt;
