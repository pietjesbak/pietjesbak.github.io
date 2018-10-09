import './css/Game.css';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Card as CardData } from './data/Cards';
import { PeerBase } from './data/PeerBase';
import { Player as PlayerData } from './data/Player';
import Deck from './Deck';
import Player from './Player';
import RemotePlayer from './RemotePlayer';

interface Props {
    playerCount: number;
    server: PeerBase;
}

interface State {
    players: PlayerData[];
    width: number;
}

interface PlayerRef {
    model: PlayerData;
    view: HTMLElement;
}

class Game extends React.Component<Props & React.ClassAttributes<Game>, State> {

    private playerRefs_: Map<number, PlayerRef> = new Map();

    constructor(props: Props & React.ClassAttributes<Game>) {
        super(props);

        this.state = {
            players: [],
            width: 960
        }
    }

    componentDidMount() {
        this.props.server.setUpdateCallback(this.updateView);
        if (this.props.server.isHost) {
            this.props.server.game.startRound();
        }

        this.setState({
            width: (ReactDOM.findDOMNode(this) as HTMLElement).clientWidth
        })
    }

    componentWillUnmount() {
        this.props.server.shutDown();
    }

    updateView = () => {
        this.setState({});
    }

    storePlayerRef = (player: number) => (ref: Player) => this.playerRefs_.set(player, {
        model: this.props.server.game.players[player],
        view: ReactDOM.findDOMNode(ref) as HTMLElement
    });

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
        const player = new PlayerData('', this.state.players.length);

        this.props.server.game.join(player);
        this.setState({
            players: [...this.state.players, player]
        });
    }

    forceStart = () => {
        this.props.server.game.forceStart();
    }

    getPlayerAngle = (index: number) => {
        const count = this.props.server.game.players.length - 2;
        return (((-count / 2 + index) * Math.PI / count) || 0) - Math.PI / 2;
    }

    getRemotePlayerPosition(player: PlayerData, index: number): { transform: string } {
        const height = 280;
        const angle = this.getPlayerAngle(index);

        return {
            transform: `translate(${Math.cos(angle) * this.state.width / 3}px, ${Math.sin(angle) * height}px)`
        };
    }

    renderAnnouncements() {
        const elements: JSX.Element[] = [];

        const cutoff = Date.now() - 2000;
        const announcements = this.props.server.game.announcements;
        for (let i = announcements.length - 1; i >= 0; i--) {
            const announcement = announcements[i];
            if (announcement.timestamp < cutoff) {
                break;
            }

            elements.push(<li key={i}>
                {announcement.message}
            </li>);
        }

        return elements;
    }

    render() {
        const players = this.props.server.game.players;
        const ownPlayer = players.find(player => player.id === this.props.server.ownId)!;
        const remotePlayers = players.filter(player => player.id !== this.props.server.ownId);

        return (
            <div className="imploding-puppies-game">
                <div className="remote-area">
                    {remotePlayers.map((player, i) => <RemotePlayer key={i} player={player} style={this.getRemotePlayerPosition(player, i)} />)}

                    <Deck
                        game={this.props.server.game}
                        getPlayerAngle={this.getPlayerAngle} />
                </div>

                <Player player={ownPlayer} />

                <ul className="announcements">
                    {this.renderAnnouncements()}
                </ul>
            </div>
        );
    }
}

export default Game;
