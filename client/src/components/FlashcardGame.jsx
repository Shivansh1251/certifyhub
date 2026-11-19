import React, { useState } from 'react';
import './FlashcardGame.css';

const FlashcardGame = ({ game }) => {
  const cards = game?.cards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knownCards, setKnownCards] = useState([]);
  const [finished, setFinished] = useState(false);
  const [activeCards, setActiveCards] = useState(cards);

  if (cards.length < 2) return null;

  const activeCard = activeCards[currentIndex];
  const advance = (knewIt) => {
    if (knewIt) setKnownCards(previous => previous.includes(currentIndex) ? previous : [...previous, currentIndex]);
    setRevealed(false);
    if (currentIndex === activeCards.length - 1) setFinished(true);
    else setCurrentIndex(previous => previous + 1);
  };
  const restart = (missedOnly = false) => {
    const nextCards = missedOnly ? activeCards.filter((_, index) => !knownCards.includes(index)) : cards;
    if (missedOnly && nextCards.length === 0) return;
    setActiveCards(nextCards);
    setKnownCards([]);
    setCurrentIndex(0);
    setRevealed(false);
    setFinished(false);
  };

  return (
    <section className="flashcard-game" aria-label={`${game.title} game`}>
      <div className="flashcard-game__header">
        <div><span className="lesson-section-label">Quick game</span><h4>{game.title}</h4></div>
        <span className="flashcard-game__score">{knownCards.length} / {activeCards.length} known</span>
      </div>
      {game.instructions && <p className="flashcard-game__instructions">{game.instructions}</p>}
      {!finished ? (
        <>
          <div className="flashcard-game__progress" aria-label={`Card ${currentIndex + 1} of ${activeCards.length}`}>
            <span style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }} />
          </div>
          <button className={`flashcard ${revealed ? 'flashcard--revealed' : ''}`} type="button" onClick={() => setRevealed(previous => !previous)} aria-label={revealed ? 'Hide definition' : `Reveal definition for ${activeCard.front}`}>
            <span className="flashcard__eyebrow">{revealed ? 'Definition' : 'Recall this term'}</span>
            <strong>{revealed ? activeCard.back : activeCard.front}</strong>
            {!revealed && <span className="flashcard__hint">Select the card to reveal</span>}
          </button>
          {revealed ? (
            <div className="flashcard-game__actions">
              <button type="button" className="flashcard-game__review" onClick={() => advance(false)}>Review again</button>
              <button type="button" className="flashcard-game__known" onClick={() => advance(true)}>I knew it</button>
            </div>
          ) : <p className="flashcard-game__counter">Card {currentIndex + 1} of {activeCards.length}</p>}
        </>
      ) : (
        <div className="flashcard-game__complete" role="status">
          <span aria-hidden="true">✦</span>
          <strong>Round complete</strong>
          <p>You recalled {knownCards.length} of {activeCards.length} cards.</p>
          <div className="flashcard-game__actions">
            {knownCards.length < activeCards.length && <button type="button" className="flashcard-game__review" onClick={() => restart(true)}>Practise missed cards</button>}
            <button type="button" className="flashcard-game__known" onClick={() => restart(false)}>Play again</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default FlashcardGame;
