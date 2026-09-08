import { useEffect, useState } from "react";

type CountdownProps = {
  message: string;
};

export function Countdown({ message }: CountdownProps) {
  const [number, setNumber] = useState(10);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNumber((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 1;
        }
        return current - 1;
      });
    }, 1_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="countdown" aria-labelledby="countdown-title">
      <div className="countdown__leader" aria-hidden="true">
        <span className="countdown__sweep" />
        <span className="countdown__number">{number}</span>
      </div>
      <div className="countdown__copy" role="status" aria-live="polite">
        <p className="kicker">Please take your seats</p>
        <h1 id="countdown-title">{message}</h1>
        <p>
          {number > 1
            ? "Finding and ranking the strongest matches."
            : "Finalising tonight's programme…"}
        </p>
      </div>
    </section>
  );
}
