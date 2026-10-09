const KeyRule = () => {
  return (
    <div aria-hidden="true" className="pub-key-rule flex h-10 items-center text-pub-brass">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="shrink-0"
      >
        <circle cx="20" cy="20" r="15" />
        <circle cx="20" cy="20" r="4" />
      </svg>
      <span className="-ml-[5px] flex-1 border-t-[1.5px] border-current" />
      <svg
        width="200"
        height="40"
        viewBox="0 0 200 40"
        className="pub-key-tip shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path
          d={
            "M0 20 H14 L22 12 H174 L194 20 L186 28 H170 L163 21 L156 28 H146 L141 24 " +
            "H132 L127 28 H115 L108 19 L101 28 H90 L85 25 H76 L71 28 H58 L51 21 L44 28 H22 L14 20 Z"
          }
        />
        <path d="M30 16 H168" strokeOpacity="0.5" />
      </svg>
    </div>
  );
};

export default KeyRule;
