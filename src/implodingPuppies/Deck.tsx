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
    discardPile: CardData[]
}

class Deck extends React.Component<Props & React.HTMLAttributes<HTMLDivElement>, State> {
    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);

        this.state = {
            discardPile: [...this.props.game.discardPile]
        }
    }

    componentDidUpdate() {
        const { addedCards, removedCards } = diffCardstate(this.state.discardPile, this.props.game.discardPile);
        if (addedCards.length > 0 || removedCards.length > 0) {

            // There is a settimeout here to trick react into first rendering the card in the start position,
            // and then in the end position right away so css transitions take care of the rest.
            window.setTimeout(() => this.setState({
                discardPile: [...this.props.game.discardPile]
            }), 0);
        }
    }

    getCardStyles(i: number, card: CardData, addedCards: CardData[]) {
        if (addedCards.indexOf(card) !== -1 && card.owner.type === OwnerType.PLAYER) {
            const { angle, x, y } = this.props.getPlayerAngle(card.owner.data!);
            return {
                transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`
            }
        }

        const offset = Math.max(0, this.props.game.discardPile.length - 10);
        return {
            transform: `rotate(${Math.sin(i + offset) * 20}deg) translate(${Math.sin(i + offset) * 20}px, ${Math.cos(i + offset) * 20}px)`
        }
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
                    <div className="discard-placeholder" />
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
