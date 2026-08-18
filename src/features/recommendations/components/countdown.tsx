import { useEffect, useState } from "react";

type CountdownProps = {
  message: string;
};

export function Countdown({ message }: CountdownProps) {
  const [number, setNumber] = useState(3);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNumber((current) => (current <= 1 ? 3 : current - 1));
    }, 430);

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
        <p>The feature presentation is almost ready.</p>
      </div>
    </section>
  );
}
