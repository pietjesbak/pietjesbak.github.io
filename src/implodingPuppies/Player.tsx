import './css/Player.css';

import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { CardTypes } from './data/Cards';
import { IPlayerCallbacks } from './data/IPlayerCallbacks';
import { Player as PlayerData } from './data/Player';
import DeckInsert from './DeckInsert';

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
    interactive?: IPlayerCallbacks;
}

interface State {
    option: Options;
    callbacks: Partial<IPlayerCallbacks>;
    playerOptions?: PlayerData[];
    cardOptions?: CardTypes[];
    deckOption?: number;
    future?: CardTypes[];
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
            seeFuture: this.seeFuture,
            clearCallbacks: this.clearCallbacks
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

    allowSelectTarget = (options: PlayerData[], playerSelectCallback: (player: PlayerData) => void) => {
        this.setState({
            option: Options.SELECT_TARGET,
            callbacks: {
                playerSelectCallback
            },
            playerOptions: options
        });
    }

    allowSelectCard = (options: CardTypes[], cardSelectCallback: (selection: CardTypes) => void) => {
        this.setState({
            option: Options.SELECT_CARD,
            callbacks: {
                cardSelectCallback
            },
            cardOptions: options
        });
    }

    allowInsertIntoDeck = (maxPosition: number, insertCallback: (position: number) => void) => {
        this.setState({
            option: Options.INSERT_IN_DECK,
            callbacks: {
                insertCallback
            },
            deckOption: maxPosition
        });
    }

    seeFuture = (types: CardTypes[], confirmCallback: () => void) => {
        this.setState({
            option: Options.SEE_FUTURE,
            callbacks: {
                confirmCallback
            },
            future: types
        });
    }

    clearCallbacks = () => {
        this.setState({
            option: Options.NONE,
            callbacks: {},
            playerOptions: undefined,
            cardOptions: undefined,
            deckOption: undefined,
            future: undefined
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
        if (this.state.option === Options.DRAW_PLAY) {
            const card = this.props.player.cards[index];
            const pos = this.props.player.selection.indexOf(card);
            if (pos !== -1) {
                this.props.player.selection.splice(pos, 1);
            } else if (card.prototype.playTest(this.props.player, this.props.player.selection)) {
                this.props.player.selection.push(card);
            }

            this.setState({});
        }
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

    selectPlayer = (player: PlayerData) => (event: React.MouseEvent<HTMLElement>) => {
        this.state.callbacks.playerSelectCallback!(player);
    }

    renderPlayerSelection() {
        return (
            <div className="player-selection player-overlay">
                {this.state.playerOptions!.map(player => (
                    <div className="player" style={{ background: player.color }} key={player.id} onClick={this.selectPlayer(player)}>
                        <span className="avatar">{player.avatar}</span>
                        <span className="name">{player.name}</span>
                    </div>
                ))}
            </div>
        )
    }

    selectCard = (type: CardTypes) => (event: React.MouseEvent<HTMLElement>) => {
        this.state.callbacks.cardSelectCallback!(type);
    }

    renderCardSelection() {
        return (
            <div className="card-selection player-overlay">
                <div className="card-container">
                    {this.state.cardOptions!.map((type, i) => <Card type={type} onClick={this.selectCard(type)} key={i} />)}
                </div>
            </div>
        )
    }

    renderFuture() {
        return (
            <div className="future player-overlay">
                <div className="card-container">
                    {this.state.future!.map((type, i) => <Card type={type} interactive={false} key={i} />)}
                </div>
                <button onClick={this.state.callbacks.confirmCallback}>Done</button>
            </div>
        );
    }

    renderInsertInDeck() {
        return <DeckInsert cards={this.state.deckOption!} type={CardTypes.BOMB} callback={this.state.callbacks.insertCallback!} />
    }

    render() {
        return (
            <div className={classNames('imploding-puppies-player', { 'interactive': this.props.interactive }, { 'active': this.state.option !== Options.NONE })}>
                <div className="player player-avatar" style={{ background: this.props.player.color }}>
                    <span className="avatar">{this.props.player.avatar}</span>
                    <span className="name">{this.props.player.name}</span>
                </div>

                {this.state.option === Options.DRAW_PLAY ? <button onClick={this.clickButton}>{this.props.player.selection.length === 0 ? 'Draw' : 'Play'}</button> : null}
                {this.state.option === Options.NOPE ? <button onClick={this.state.callbacks.nopeCallback}>Nope!</button> : null}
                {this.state.option === Options.SELECT_TARGET ? this.renderPlayerSelection() : null}
                {this.state.option === Options.SELECT_CARD ? this.renderCardSelection() : null}
                {this.state.option === Options.SEE_FUTURE ? this.renderFuture() : null}
                {this.state.option === Options.INSERT_IN_DECK ? this.renderInsertInDeck() : null}

                {this.props.player.cards.map((card, i) => <Card
                    style={this.getCardStyles(i)}
                    canSelect={this.state.option === Options.DRAW_PLAY && card.prototype.playTest(this.props.player, this.props.player.selection)}
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
