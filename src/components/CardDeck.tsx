import '../css/CardDeck.css';

import classNames from 'classnames';
import * as React from 'react';
import { shuffle } from '../Helpers';

export enum CardFaces {
    HEARTS = '♥',
    DIAMONDS = '♦',
    CLUBS = '♣',
    SPADES = '♠',
    JOKER = '★'
}

interface CardProps {
    face: CardFaces,
    value: number
}

export function Card<T extends React.HTMLAttributes<React.Component>>(props: T & CardProps) {
    // @ts-ignore Spreading types with generics is not supported (yet).
    const { className, face, value, ...rest } = props;
    const color = (face === CardFaces.CLUBS || face === CardFaces.SPADES) ? 'black' : 'red';
    let text = '';
    if (face !== CardFaces.JOKER) {
        if (value < 11) {
            text = String(value);
        } else {
            text = ['V', 'Q', 'K'][value - 11];
        }
    }

    return (
        <div className={classNames(className, 'card', color)} {...rest}>
            <span className="card-value card-value-left">{text}</span>
            <span className="card-face">{face}</span>
            <span className="card-value card-value-right">{text}</span>
        </div>
    );
}

interface Props {
    shuffle?: boolean;
    jokers?: boolean;
}

interface State {
    cards: CardProps[];
    revealedCards: CardProps[];
}

class CardDeck extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        const cards: CardProps[] = [];
        for (const face of [CardFaces.HEARTS, CardFaces.DIAMONDS, CardFaces.CLUBS, CardFaces.SPADES]) {
            for (let value = 1; value <= 13; value++) {
                cards.push({ face, value });
            }
        }

        if (props.jokers) {
            cards.push({ face: CardFaces.JOKER, value: 0 });
            cards.push({ face: CardFaces.JOKER, value: 0 });
        }

        if (props.shuffle) {
            shuffle(cards);
        }

        this.state = {
            cards,
            revealedCards: []
        }
    }

    reveal = () => {
        const copy = this.state.cards.slice();
        const card = copy.shift();
        if (card !== undefined) {
            this.setState({
                cards: copy,
                revealedCards: [...this.state.revealedCards, card]
            });
        }
    }

    revealAll = () => {
        this.setState({
            cards: [],
            revealedCards: [...this.state.revealedCards, ...this.state.cards.reverse()]
        });
    }

    render() {
        const size = this.state.cards.length / 10;

        return (
            <div className="card-deck-table">
                {this.state.cards.length > 0 ? (
                    <>
                        <div className="card-deck card" style={{ transform: `translate(${-size * 2}px, ${-size * 2}px)`, boxShadow: `${size}px ${size}px ${size}px ${size}px #333` }} />
                        <div className="buttons">
                            <button onClick={this.reveal}>Trek een kaart</button>
                            <button onClick={this.revealAll}>Trek alle kaarten</button>
                        </div>
                    </>
                ) : null}

                <div className="revealed-cards">
                    {this.state.revealedCards.map((card, i) => <Card key={i} face={card.face} value={card.value} />)}
                </div>
            </div>
        );
    }
}

export default CardDeck;
