import './css/Player.css';

import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { Card as CardData, CardTypes, diffCardstate } from './data/Cards';
import { Game } from './data/Game';
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
    game: Game;
    small?: boolean;
    exposeDrawFn?: (drawFn?: () => void) => void;
}

interface State {
    option: Options;
    callbacks: Partial<IPlayerCallbacks>;
    playerOptions?: PlayerData[];
    cardOptions?: CardTypes[];
    deckOption?: number;
    future?: CardTypes[];
    cards: CardData[];
}

class Player extends React.PureComponent<Props & React.HTMLAttributes<HTMLDivElement>, State> {
    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
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
            callbacks: {},
            cards: [...this.props.player.cards]
        }
    }

    componentDidUpdate() {
        const { addedCards, removedCards } = diffCardstate(this.state.cards, this.props.player.cards);
        if (addedCards.length > 0 || removedCards.length > 0) {

            // There is a requesanimationframe here to trick react into first rendering the card in the start position,
            // and then in the end position right away so css transitions take care of the rest.
            window.requestAnimationFrame(() => this.setState({
                cards: [...this.props.player.cards]
            }));
        }
    }

    //#region Callbacks
    giveOptions = (drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) => {
        this.setState({
            option: Options.DRAW_PLAY,
            callbacks: {
                drawCallback,
                playCallback
            }
        });

        if (this.props.exposeDrawFn !== undefined) {
            this.props.exposeDrawFn(drawCallback);
        }
    }

    allowNope = (nopeCallback: () => void) => {
        this.props.player.selection.push(this.props.player.find(CardTypes.NOPE)!);
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
    //#endregion

    clearCallbacks = () => {
        this.props.player.clearSelection();
        this.setState({
            option: Options.NONE,
            callbacks: {},
            playerOptions: undefined,
            cardOptions: undefined,
            deckOption: undefined,
            future: undefined
        });

        if (this.props.exposeDrawFn !== undefined) {
            this.props.exposeDrawFn(undefined);
        }
    }

    getCardStyles(index: number, card: CardData, addedCards: CardData[]) {
        if (addedCards.indexOf(card) !== -1) {
            return {
                transform: `translate(0px, -200px) rotate(0deg)`
            };
        }

        const count = this.props.player.cards.length - 1;
        const range = Math.sqrt(count / 2) * (this.props.small ? 20 : 36);

        return {
            transform: `translate(${(-count / 2 + index) * 10}px, 50px) rotate(${(-count / 2 + index) * range / count}deg)`
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

            this.forceUpdate();
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
        const disabled = this.props.player.selection.length !== 0 && !this.props.player.canPlay(this.props.game);

        return (
            <button disabled={disabled} onClick={this.clickButton}>{text}</button>
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
        const { addedCards } = diffCardstate(this.state.cards, this.props.player.cards);

        return (
            <div className={classNames('imploding-puppies-player', { 'small': this.props.small }, { 'active': this.state.option !== Options.NONE })}>
                <div className={classNames('player', 'player-avatar', { 'dead': !this.props.player.alive })} style={{ background: this.props.player.color }}>
                    <span className="avatar">{this.props.player.avatar}</span>
                    <span className="name">{this.props.player.name}</span>
                </div>

                {this.state.option === Options.DRAW_PLAY ? this.getPlayButton() : null}
                {this.state.option === Options.NOPE ? <button className="nope" onClick={this.state.callbacks.nopeCallback}>Nope!</button> : null}
                {this.state.option === Options.SELECT_TARGET ? this.renderPlayerSelection() : null}
                {this.state.option === Options.SELECT_CARD ? this.renderCardSelection() : null}
                {this.state.option === Options.SEE_FUTURE ? this.renderFuture() : null}
                {this.state.option === Options.INSERT_IN_DECK ? this.renderInsertInDeck() : null}

                <div className="own-cards">
                    {this.props.player.cards.map((card, i) => <Card
                        key={card.id}
                        style={this.getCardStyles(i, card, addedCards)}
                        canSelect={this.state.option === Options.DRAW_PLAY && card.prototype.playTest(this.props.player, this.props.player.selection)}
                        selected={this.props.player.selection.indexOf(card) !== -1}
                        onClick={this.clickCard(i)}
                        type={card.prototype.type}
                    />)}
                </div>
            </div>
        );
    }
}

export default Player;
