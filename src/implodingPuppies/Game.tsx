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
    playerAngles: Map<number, number>;
    width: number;
}

class Game extends React.Component<Props & React.ClassAttributes<Game>, State> {

    constructor(props: Props & React.ClassAttributes<Game>) {
        super(props);

        this.state = {
            players: [],
            width: 960,
            playerAngles: new Map()
        }
    }

    componentDidMount() {
        this.props.server.setUpdateCallback(this.updateView);
        if (this.props.server.isHost) {
            this.props.server.game.startRound();
        }

        // Calculate the correct angle for every player.
        // The own player should be a the bottom and the others around him in the right order.
        const playerAngles = new Map<number, number>();
        playerAngles.set(this.props.server.ownId, Math.PI / 2);

        let i = this.props.server.ownId;
        let counter = 0;
        while (true) {
            i++;
            if (i >= this.props.server.players.length) {
                i = 0;
            }

            if (i === this.props.server.ownId) {
                break;
            }

            playerAngles.set(i, this.getPlayerAngle_(counter));
            counter++;
        };

        this.setState({
            width: (ReactDOM.findDOMNode(this) as HTMLElement).clientWidth,
            playerAngles
        })
    }

    componentWillUnmount() {
        this.props.server.shutDown();
    }

    updateView = () => {
        this.setState({});
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
        const player = new PlayerData('', this.state.players.length);

        this.props.server.game.join(player);
        this.setState({
            players: [...this.state.players, player]
        });
    }

    forceStart = () => {
        this.props.server.game.forceStart();
    }

    getPlayerPos = (playerId: number) => {
        const height = 280;
        const angle = this.state.playerAngles.get(playerId)!;

        return {
            angle,
            x: Math.cos(angle) * this.state.width / 3,
            y: Math.sin(angle) * height
        };
    }

    getRemotePlayerPosition(player: PlayerData): { transform: string } {
        const { x, y } = this.getPlayerPos(player.id);

        return {
            transform: `translate(${x}px, ${y}px)`
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
                <div className="active-player-highlight" style={this.getRemotePlayerPosition(this.props.server.game.currentPlayer)} />
                <div className="remote-area">
                    {remotePlayers.map((player, i) => <RemotePlayer key={i} player={player} style={this.getRemotePlayerPosition(player)} />)}
                </div>
                <Player player={ownPlayer} />

                <Deck
                    game={this.props.server.game}
                    getPlayerAngle={this.getPlayerPos} />

                <ul className="announcements">
                    {this.renderAnnouncements()}
                </ul>
            </div>
        );
    }

    private getPlayerAngle_(index: number) {
        const count = this.props.server.game.players.length - 2;
        return (((-count / 2 + index) * Math.PI / count) || 0) - Math.PI / 2;
    }
}

export default Game;
