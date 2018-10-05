import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { Game as GameData } from './data/Game';

interface Props {
    game: GameData;
    deckRef?: (ref: any) => void;
    discardRef?: (ref: any) => void;
}

class Deck extends React.Component<Props & React.HTMLAttributes<HTMLDivElement>> {
    render() {
        const { game, onClick, deckRef, discardRef, ...rest } = this.props;
        const size = game.deck.cards.length / 10;

        return (
            <div {...rest}>
                {size > 0 ? (
                    <div ref={deckRef} onClick={onClick} className={classNames('imploding-puppies-deck', 'card-deck', { 'interactive': true })} style={{ transform: `translate(${-size * 2}px, ${-size * 2}px)`, boxShadow: `${size}px ${size}px ${size}px ${size}px #333` }} />
                ) : null}
                <div ref={discardRef} className={classNames('imploding-puppies-discard')}>
                    {game.discardPile.slice(-10).map((card, i) => <Card key={i} type={card.prototype.type} interactive={false} style={{ transform: `rotate(${Math.sin(i) * 20}deg) translate(${Math.sin(i) * 20}px, ${Math.cos(i) * 20}px)` }} />)}
                </div>
            </div>
        );
    }
}

export default Deck;
