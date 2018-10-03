import './css/Game.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { repeat } from '../Helpers';
import { Card as CardData, OwnerType } from './data/Cards';
import { Deck as DeckData } from './data/Deck';
import { Game as GameData } from './data/Game';
import { Player as PlayerData } from './data/Player';
import Deck from './Deck';
import Player from './Player';

interface Props {
    playerCount: number;
}

interface State {
    game: GameData;
    players: PlayerData[];
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

    private playerRefs_: Map<number, PlayerRef> = new Map();

    private deckRef_: DeckRef;

    private discardRef_: HTMLElement;

    constructor(props: Props & React.ClassAttributes<Game>) {
        super(props);

        const game = new GameData(true);
        game.gameLoop();
        game.setUpdateCallback(this.updateView);

        this.state = {
            game,
            players: [],
            canNope: false
        }
    }

    // componentDidMount() {
    //     // Update the view after the refs are defined.
    //     this.updateView();
    // }

    componentWillUnmount() {
        this.state.game.shutDown();
    }

    updateView = () => {
        this.setState({});
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

    joinPlayer = () => {
        const player = new PlayerData([], this.state.players.length);

        this.state.game.join(player);
        this.setState({
            players: [...this.state.players, player]
        });
    }

    forceStart = () => {
        this.state.game.forceStart();
    }

    renderPlayers() {
        return (
            <div>
                {repeat(4 - this.state.game.playerCount).map((unused, i) => <button key={i} onClick={this.joinPlayer}>Join</button>)}
                <button onClick={this.forceStart}>Force start</button>
            </div>
        )
    }

    renderGame() {
        return (
            <>
                {this.state.game.players.map((player, i) => <Player
                    ref={this.storePlayerRef(i)}
                    key={i}
                    player={player} />
                )}

                <Deck
                    deckRef={this.deckRef}
                    discardRef={this.discardRef}
                    game={this.state.game} />
            </>
        );
    }

    render() {
        return (
            <div className="imploding-puppies-game">
                {this.state.game.players.length === 0 ? this.renderPlayers() : this.renderGame()}
            </div>
        );
    }
}

export default Game;
