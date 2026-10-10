// A hairline under the hero that ends in a small key, as if the key hangs off
// the end of the line. Decorative only.
const KeyRule = () => {
  return (
    <div aria-hidden="true" className="pub-key">
      <span className="pub-key-line" />
      <svg
        viewBox="0 0 128 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pub-key-art"
      >
        <circle cx="20" cy="22" r="17" />
        <circle cx="13" cy="22" r="4.5" />
        <path
          d={
            "M35.9 16 H110 L124 23 L117 30 H108 L104 25 L100 30 H94 L90 23 L86 30 " +
            "H78 L75 26 H70 L67 30 H60 L56 24 L52 30 H35"
          }
        />
        <path d="M44 20.5 H106" strokeOpacity="0.45" />
      </svg>
    </div>
  );
};

export default KeyRule;
