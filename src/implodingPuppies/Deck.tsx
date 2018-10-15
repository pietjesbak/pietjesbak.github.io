import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { Card as CardData, diffCardstate, OwnerType } from './data/Cards';
import { Game as GameData } from './data/Game';

interface Props {
    game: GameData;
    getPlayerAngle(playerId: number): { angle: number, x: number, y: number };
}

interface State {
    discardPile: CardData[];
    orderIndex: number;
}

class Deck extends React.Component<Props & React.HTMLAttributes<HTMLDivElement>, State> {
    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);

        this.state = {
            discardPile: [...this.props.game.discardPile],
            orderIndex: 0
        }
    }

    componentDidUpdate() {
        const { addedCards, removedCards } = diffCardstate(this.state.discardPile, this.props.game.discardPile);
        if (addedCards.length > 0 || removedCards.length > 0) {
            // There is a settimeout here to trick react into first rendering the card in the start position,
            // and then in the end position right away so css transitions take care of the rest.
            window.setTimeout(() => {
                this.setState({
                    discardPile: [...this.props.game.discardPile]
                });
            }, 0);
        }
    }

    getCardStyles(i: number, card: CardData, addedCards: CardData[]) {
        let transform: string;
        const offset = Math.max(0, this.props.game.discardPile.length - 10);
        if (addedCards.indexOf(card) !== -1) {
            if (card.owner.type === OwnerType.PLAYER) {
                const { angle, x, y } = this.props.getPlayerAngle(card.owner.data!);
                transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
            } else {
                // Assume it came from the deck.
                transform = `translate(-100px, 0px) rotate(0deg)`;
            }
        } else if (this.state.orderIndex > i + offset) {
            transform = `rotate(0deg) translate(${-i / 2}px, ${20 - i / 2}px)`
        } else {
            transform = `rotate(${Math.sin(i + offset) * 20}deg) translate(${Math.sin(i + offset) * 20}px, ${Math.cos(i + offset) * 20}px)`
        }

        return {
            transform
        };
    }

    orderDiscard = () => {
        this.setState({
            orderIndex: this.props.game.discardPile.length
        });
    }

    render() {
        const { game, onClick, className, getPlayerAngle, ...rest } = this.props;
        const size = game.deck.cards.length / 10;
        const { addedCards } = diffCardstate(this.state.discardPile, this.props.game.discardPile);
        const offset = Math.max(0, this.props.game.discardPile.length - 10);

        return (
            <div className={classNames(className, 'imploding-puppies-deck-holder')} {...rest}>
                {size > 0 ? (
                    <div onClick={onClick} className={classNames('imploding-puppies-deck', 'card-deck')} style={{ transform: `translate(${-size * 2}px, ${-size * 2}px)`, boxShadow: `${size}px ${size}px ${size}px ${size}px #333` }}>
                        <span>{game.deck.cards.length}</span>
                    </div>
                ) : null}

                <div className={classNames('imploding-puppies-discard')}>
                    <div className="discard-placeholder" onClick={this.orderDiscard} />
                    {game.discardPile.slice(-10).map((card, i) => <Card
                        key={offset + i}
                        type={card.prototype.type}
                        interactive={false}
                        style={this.getCardStyles(i, card, addedCards)} />)}
                </div>
            </div>
        );
    }
}

export default Deck;
