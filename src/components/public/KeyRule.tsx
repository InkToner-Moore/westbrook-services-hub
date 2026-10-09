const KeyRule = () => {
  return (
    <div className="pub-key text-pub-brass mt-14 sm:mt-20" aria-hidden="true">
      <svg
        className="pub-key-head"
        viewBox="0 0 76 64"
        fill="currentColor"
      >
        {/* One outer contour joins the bow, blade and collar without overlap holes. */}
        <path
          fillRule="evenodd"
          d="M61.393877 26A30 30 0 1 0 61.393877 38H63V42Q63 43 64 43H68Q69 43 69 42V38H76V26H69V22Q69 21 68 21H64Q63 21 63 22V26ZM30.5 32A7.5 7.5 0 1 0 15.5 32A7.5 7.5 0 1 0 30.5 32Z"
        />
      </svg>
      <div className="pub-key-blade">
        <div className="pub-key-bar" />
        <div className="pub-key-groove" />
        <div className="pub-key-teeth" />
      </div>
      <svg
        className="pub-key-tip"
        viewBox="0 0 40 64"
        fill="currentColor"
      >
        <path d="M0 26H18L38 33L27 44H0Z" />
      </svg>
    </div>
  );
};

export default KeyRule;
