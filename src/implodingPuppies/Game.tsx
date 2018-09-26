import './css/Game.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Card from './Card';
import { Card as CardData, OwnerType } from './data/Cards';
import { Deck as DeckData } from './data/Deck';
// import Card from './Card';
// import { CardTypes } from './data/Cards';
import { Game as GameData } from './data/Game';
import { Player as PlayerData } from './data/Player';
import Deck from './Deck';
import Player from './Player';

interface Props {
    playerCount: number;
}

interface State {
    game: GameData;
    canNope: boolean;
}

interface PlayerRef {
    model: PlayerData;
    view: HTMLElement;
}

interface DeckRef {
    model: DeckData;
    view: HTMLElement;
}

class Game extends React.Component<Props & React.ClassAttributes<Game>, State> {
    private mounted_: boolean = false;

    private nopeHandler_: (player: number) => void;

    private playerRefs_: Map<number, PlayerRef> = new Map();

    private deckRef_: DeckRef;

    private discardRef_: HTMLElement;

    constructor(props: Props & React.ClassAttributes<Game>) {
        super(props);

        const game = new GameData(props.playerCount);
        game.setCallbacks(this.waitForNopes, this.updateView);

        this.state = {
            game,
            canNope: false
        }
    }

    componentDidMount() {
        // Update the view after the refs are defined.
        this.updateView();

        this.mounted_ = true;
        this.gameLoop();
    }

    componentWillUnmount() {
        this.mounted_ = false;
    }

    async gameLoop() {
        while (this.mounted_ === true) {
            console.log('turn start');

            await this.state.game.playTurn();
            this.setState({ game: this.state.game });
        }
    }

    updateView = () => {
        this.setState({ game: this.state.game });
    }

    waitForNopes = async () => {
        let result: number | null = null;
        this.setState({ canNope: true });
        const nopePromise = new Promise(resolve => this.nopeHandler_ = resolve);

        try {
            result = await Promise.race([
                new Promise((resolve, reject) => window.setTimeout(reject, 2000)),
                nopePromise
            ]) as number;
        } catch (e) {
            // No one noped
        }

        this.setState({ canNope: false });
        return result;
    }

    // moveCardToDiscard = (index: number, type: CardTypes) => {
    //     const player = this.playerRefs_.get(index)!;

    //     this.setState({
    //         movingCards: [...this.state.movingCards, {
    //             type: type,
    //             x2: player.offsetLeft + player.clientWidth / 2,
    //             y2: player.offsetTop + player.clientHeight / 2,
    //             x1: this.discardRef_.offsetLeft + this.discardRef_.clientWidth / 2,
    //             y1: this.discardRef_.offsetTop + this.discardRef_.clientHeight / 2,
    //             rotation: 0,
    //             timestamp: Date.now()
    //         }]
    //     });
    // }

    getCallbacks(index: number) {
        const player = this.playerRefs_.get(index)!;
        // if (index === this.state.game.currentPlayer) {
        return {
            onDraw: () => {
                this.state.game.playerDraw(index);
            },
            onPlay: () => {
                this.state.game.playerPlay(index, player.model.selection);
            },
            onNope: () => {
                this.nopeHandler_(index);
            }
        };
        // }

        // return undefined;
    }

    onDraw = () => {
        this.state.game.playerDraw(this.state.game.currentPlayer);
    }

    storePlayerRef = (player: number) => (ref: Player) => this.playerRefs_.set(player, {
        model: this.state.game.players[player],
        view: ReactDOM.findDOMNode(ref) as HTMLElement
    });

    deckRef = (ref: any) => this.deckRef_ = {
        model: this.state.game.deck,
        view: ReactDOM.findDOMNode(ref) as HTMLElement
    };

    discardRef = (ref: any) => this.discardRef_ = ReactDOM.findDOMNode(ref) as HTMLElement;

    getCardStyle(card: CardData, index: number) {
        if (card.owner.type === OwnerType.DISCARD) {
            return {
                transform: `translate(100px, 100px)`
            };

        } else if (card.owner.type === OwnerType.PLAYER) {
            let top = 0;
            let left = 0;
            let width = 0;
            const player = this.playerRefs_.get(card.owner.data!);
            if (player !== undefined) {
                width = (player.view.clientWidth) / player.model.cards.length * index * Math.min(1, player.model.cards.length / 10);
                top = player.view.offsetTop + player.view.clientHeight / 2;
                left = player.view.offsetLeft;
            }

            return {
                transform: `translate(${left + width}px, ${top - 100}px)`
            };
        }

        return {};
    }

    clickCard = (player: PlayerData, card: CardData) => () => {
        const pos = player.selection.indexOf(card);
        if (pos === -1) {
            if (card.prototype.playTest(player, player.selection)) {
                player.selection.push(card);
            }
        } else {
            player.selection.splice(pos, 1);
        }

        this.setState({});
    }

    render() {
        return (
            <div className="imploding-puppies-game">
                <Deck
                    deckRef={this.deckRef}
                    discardRef={this.discardRef}
                    onClick={this.onDraw}
                    game={this.state.game} />

                {this.state.game.discardPile.map(card => <Card key={card.id} className="moving-card" type={card.prototype.type} style={this.getCardStyle(card, 0)} />)}

                {this.state.game.players.map((player, i) => <Player
                    ref={this.storePlayerRef(i)}
                    key={'p' + i}
                    interactive={this.getCallbacks(i)}
                    active={i === this.state.game.currentPlayer}
                    player={player} />)}

                {this.state.game.players.map(player => player.cards.map((card, i) => <Card
                    key={card.id}
                    type={card.prototype.type}
                    className="moving-card"
                    canSelect={card.prototype.playTest(player, player.selection)}
                    selected={player.selection.indexOf(card) !== -1}
                    onClick={this.clickCard(player, card)}
                    style={this.getCardStyle(card, i)} />))}

                {/* {this.state.game.players.map((player, i) => <Player
                    ref={this.storePlayerRef(i)}
                    key={'p' + i}
                    player={player}
                    canNope={this.state.game.currentPlayer !== i && this.state.canNope}
                    interactive={this.getCallbacks(i)}
                    active={i === this.state.game.currentPlayer} />)} */}

                {/* {this.state.movingCards.map((card, i) => <Card
                    key={'c' + i}
                    target={{ x: card.x2, y: card.y2, destroyCallback: this.destroyMovingCard(i) }}
                    className="moving-card"
                    style={{ transform: `translate(${card.x1}px, ${card.y1}px) rotate(0deg)` }} />)} */}
            </div>
        );
    }
}

export default Game;
