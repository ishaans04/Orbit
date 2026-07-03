import { useEffect, useState } from "react";

const words = ["Orbit", "Command"];
const TYPE_DELAY = 115;
const DELETE_DELAY = 70;
const HOLD_DELAY = 1350;
const NEXT_DELAY = 260;

export default function TypingHeroWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const [letterCount, setLetterCount] = useState(words[0].length);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) {
      setWordIndex(0);
      setLetterCount(words[0].length);
      setIsDeleting(false);
      return undefined;
    }

    const currentWord = words[wordIndex];
    const isWordComplete = !isDeleting && letterCount === currentWord.length;
    const isWordDeleted = isDeleting && letterCount === 0;
    const delay = isWordComplete
      ? HOLD_DELAY
      : isWordDeleted
        ? NEXT_DELAY
        : isDeleting
          ? DELETE_DELAY
          : TYPE_DELAY;

    const timeoutId = window.setTimeout(() => {
      if (isWordComplete) {
        setIsDeleting(true);
        return;
      }

      if (isWordDeleted) {
        setWordIndex((index) => (index + 1) % words.length);
        setIsDeleting(false);
        return;
      }

      setLetterCount((count) => count + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [isDeleting, letterCount, wordIndex]);

  const visibleWord = words[wordIndex].slice(0, letterCount);

  return (
    <span className="typing-hero-word" aria-label={`${words[wordIndex]}.`}>
      <span className="typing-hero-word-text" aria-hidden="true">
        {visibleWord}
        <span className="typing-hero-dot">.</span>
      </span>
      <span className="typing-hero-cursor" aria-hidden="true" />
    </span>
  );
}
