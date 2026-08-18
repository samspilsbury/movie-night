import type { CSSProperties } from "react";

const PIECE_COUNT = 46;

type PopcornStyle = CSSProperties & {
  "--popcorn-delay": string;
  "--popcorn-drift": string;
  "--popcorn-duration": string;
  "--popcorn-rotation": string;
  "--popcorn-scale": number;
};

const pieces = Array.from({ length: PIECE_COUNT }, (_, index) => {
  const style: PopcornStyle = {
    left: `${(index * 37 + 7) % 101}%`,
    "--popcorn-delay": `${-180 + ((index * 83) % 330)}ms`,
    "--popcorn-drift": `${-55 + ((index * 29) % 111)}px`,
    "--popcorn-duration": `${560 + ((index * 47) % 230)}ms`,
    "--popcorn-rotation": `${180 + ((index * 71) % 540)}deg`,
    "--popcorn-scale": 0.62 + ((index * 19) % 58) / 100,
  };
  return style;
});

export function PopcornTransition() {
  return (
    <div className="popcorn-transition" aria-hidden="true">
      {pieces.map((style, index) => (
        <span className="popcorn-transition__piece" style={style} key={index}>
          <span className="popcorn-transition__kernel" />
        </span>
      ))}
    </div>
  );
}
