import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { CardTypes } from './data/Cards';
import { Player as PlayerData } from './data/Player';

interface Callbacks {
    drawCallback: () => void;
    playCallback: (selection: CardTypes[]) => void;
    nopeCallback: () => void;
    playerSelectCallback: (player: PlayerData) => void;
    cardSelectCallback: (selection: CardTypes) => void;
    insertCallback: (position: number) => void;
    confirmCallback: () => void;
}

export const enum Options {
    NONE = 'none',
    DRAW_PLAY = 'draw play',
    NOPE = 'nope',
    SELECT_TARGET = 'select target',
    SELECT_CARD = 'select card',
    INSERT_IN_DECK = 'insert in deck',
    SEE_FUTURE = 'see future'
}

interface Props {
    player: PlayerData;
    interactive?: Callbacks;
    canNope?: boolean;
    active?: boolean;
}

interface State {
    option: Options,
    callbacks: Partial<Callbacks>
}

class Player extends React.Component<Props & React.ClassAttributes<Player>, State> {
    constructor(props: Props & React.ClassAttributes<Player>) {
        super(props);

        this.props.player.setCallbacks({
            giveOptions: this.giveOptions,
            allowNope: this.allowNope,
            allowSelectTarget: this.allowSelectTarget,
            allowSelectCard: this.allowSelectCard,
            allowInsertIntoDeck: this.allowInsertIntoDeck,
            seeFuture: this.seeFuture
        });

        this.state = {
            option: Options.NONE,
            callbacks: {}
        }
    }

    giveOptions = (drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) => {
        this.setState({
            option: Options.DRAW_PLAY,
            callbacks: {
                drawCallback,
                playCallback
            }
        });
    }

    allowNope = (nopeCallback: () => void) => {
        this.setState({
            option: Options.NOPE,
            callbacks: {
                nopeCallback
            }
        });
    }

    allowSelectTarget = (playerSelectCallback: (player: PlayerData) => void) => {
        this.setState({
            option: Options.SELECT_TARGET,
            callbacks: {
                playerSelectCallback
            }
        });
    }

    allowSelectCard = (options: CardTypes[], cardSelectCallback: (selection: CardTypes) => void) => {
        this.setState({
            option: Options.SELECT_CARD,
            callbacks: {
                cardSelectCallback
            }
        });
    }

    allowInsertIntoDeck = (maxPosition: number, insertCallback: (position: number) => void) => {
        this.setState({
            option: Options.INSERT_IN_DECK,
            callbacks: {
                insertCallback
            }
        });
    }

    seeFuture = (cards: CardTypes[], confirmCallback: () => void) => {
        this.setState({
            option: Options.SEE_FUTURE,
            callbacks: {
                confirmCallback
            }
        });
    }

    getCardStyles(index: number) {
        const count = this.props.player.cards.length - 1;
        const range = Math.sqrt(count / 2) * 36;

        return {
            transform: `translateX(${(-count / 2 + index) * 10}px) rotate(${(-count / 2 + index) * range / count}deg)`
        };
    }

    clickCard = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
        // this.setState(state => {
        //     const selection = [...state.selection];
        //     const pos = selection.indexOf(index);

        //     if (pos === -1) {
        //         if (cards.get(this.props.player.cards[index])!.playTest(this.props.player, this.selection)) {
        //             selection.push(index);
        //         }
        //     } else {
        //         selection.splice(pos, 1);
        //     }

        //     return { selection };
        // });
    }

    clickButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (this.props.player.selection.length === 0) {
            this.state.callbacks.drawCallback!();
        } else {
            this.state.callbacks.playCallback!(this.props.player.selection.map(card => card.prototype.type));
        }
    }

    getPlayButton() {
        const text = this.props.player.selection.length === 0 ? 'Draw' : 'Play';
        return (
            <button onClick={this.clickButton}>{text}</button>
        );
    }

    render() {
        return (
            <div className={classNames('imploding-puppies-player', { 'interactive': this.props.interactive }, { 'active': this.props.active })}>
                <button onClick={this.clickButton}>{this.props.player.selection.length === 0 ? 'Draw' : 'Play'}</button>
                {this.props.player.cards.map((card, i) => <Card
                            style={this.getCardStyles(i)}
                            canSelect={card.prototype.playTest(this.props.player, this.props.player.selection)}
                            selected={this.props.player.selection.indexOf(card) !== -1}
                            onClick={this.clickCard(i)}
                            type={card.prototype.type}
                            key={i}
                        />)}
            </div>
        );
    }
}

export default Player;
