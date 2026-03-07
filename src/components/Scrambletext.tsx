import { useState, useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*/?!";

export const useScramble = (text: string, active: boolean, speed = 40) => {
  const [output, setOutput] = useState(() =>
    text
      .split("")
      .map(() => " ")
      .join(""),
  );
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    frame.current = 0;
    if (timer.current) clearInterval(timer.current);

    timer.current = setInterval(() => {
      const progress = frame.current / (text.length * 3);
      setOutput(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (frame.current / 3 > i) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join(""),
      );
      frame.current++;
      if (frame.current > text.length * 3 + 10) {
        clearInterval(timer.current!);
        setOutput(text);
      }
    }, speed);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, active, speed]);

  return output;
};

interface ScrambleTextProps {
  text: string;
  active?: boolean;
  speed?: number;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
}

export const ScrambleText = ({
  text,
  active = true,
  speed = 30,
  className = "",
  tag: Tag = "span",
}: ScrambleTextProps) => {
  const scrambled = useScramble(text, active, speed);
  return <Tag className={className}>{scrambled}</Tag>;
};
