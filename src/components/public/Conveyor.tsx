import BackdropArt from "./BackdropArt";

const sequence = [
  "parcel", "tag-ups", "drop", "parcel", "tag-fedex", "cartridge", "parcel", "tag-purolator", "key",
] as const;

const Conveyor = () => {
  return (
    <div aria-hidden="true" className="pub-conveyor border-t border-pub-edge">
      <div className="pub-conveyor-track">
        {[0, 1].map((half) => (
          <div key={half} className="pub-conveyor-half">
            {sequence.map((kind, index) => (
              <BackdropArt
                key={`${kind}-${index}`}
                kind={kind}
                className={"pub-conveyor-art" + (kind.startsWith("tag-") ? " pub-conveyor-tag" : "")}
              />
            ))}
          </div>
        ))}
      </div>
      <span className="pub-conveyor-baseline" />
    </div>
  );
};

export default Conveyor;
