import type { ComponentProps, CSSProperties } from "react";
import BackdropArt from "./BackdropArt";

type BackdropItem = {
  kind: ComponentProps<typeof BackdropArt>["kind"];
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rotate: number;
  speed: number;
  hideBelow?: "sm" | "md" | "lg";
};

const Backdrop = ({ items }: { items: BackdropItem[] }) => {
  return (
    <div aria-hidden="true" className="pub-backdrop">
      {items.map((item, index) => (
        <span
          key={`${item.kind}-${index}`}
          className={
            "pub-backdrop-item" +
            (item.kind.startsWith("tag-") ? " pub-backdrop-tag" : "") +
            (item.hideBelow ? ` pub-backdrop-hide-${item.hideBelow}` : "")
          }
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            width: item.size,
            height: item.kind.startsWith("tag-") ? item.size / 2 : item.size,
            "--speed": item.speed,
          } as CSSProperties}
        >
          <span
            className="pub-backdrop-float"
            style={{
              "--rot": `${item.rotate}deg`,
              animationDuration: `${9 + (index * 3) % 9}s`,
              animationDelay: `${-3 - index * 4}s`,
            } as CSSProperties}
          >
            <BackdropArt kind={item.kind} className="pub-backdrop-art" />
          </span>
        </span>
      ))}
    </div>
  );
};

export default Backdrop;
