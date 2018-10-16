import './css/Server.css';

import classNames from 'classnames';
import * as React from 'react';
import Tooltip from 'react-simple-tooltip';
import { cards, CardTypes } from './data/Cards';
import { Client as ClientData } from './data/Client';
import { Game as GameData } from './data/Game';
import { PeerBase } from './data/PeerBase';
import { Player } from './data/Player';
import { Server as ServerData } from './data/Server';
import Game from './Game';

interface State {
    key: string;
    name: string;
    server?: PeerBase;
}

class Server extends React.PureComponent<React.HTMLAttributes<HTMLDivElement>, State> {
    constructor(props: React.HTMLAttributes<HTMLDivElement>) {
        super(props);

        this.state = {
            key: '',
            name: '',
            server: undefined
        };
    }

    updateKey = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            key: (event.target as HTMLInputElement).value
        });
    }

    updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            name: (event.target as HTMLInputElement).value
        });
    }

    createServer = () => {
        const server = new ServerData(this.state.key);
        server.connectSelf(this.state.name);
        server.setUpdateCallback(this.updateCallback);

        this.setState({ server });
    }

    joinServer = () => {
        const client = new ClientData(this.state.key);
        client.connectSelf(this.state.name);
        client.setUpdateCallback(this.updateCallback);

        this.setState({ server: client });
    }

    updateCallback = () => {
        this.forceUpdate();
    }

    kick = (player: Player) => () => {
        (this.state.server as ServerData).kick(player);
    }

    reset = () => {
        this.setState({
            server: undefined
        });
    }

    renderForm() {
        const { className, ...rest } = this.props;
        return (
            <div className={classNames('server-dialog', className)} {...rest}>
                <h3>Join or create a server</h3>
                <div>
                    <h4>
                        Name:
                        <Tooltip placement="right" content={<div style={{ width: 200 }}>This is your nickname in the game and will be shown to other players.</div>}>
                            <i className="icon-info" />
                        </Tooltip>
                    </h4>
                    <input autoFocus={true} value={this.state.name} onChange={this.updateName} />
                </div>
                <div>
                    <h4>
                        Key:
                        <Tooltip placement="right" content={<div style={{ width: 200 }}>Share this key with the people you want to play the game with. Players with the same key join the same server.</div>}>
                            <i className="icon-info" />
                        </Tooltip>
                    </h4>
                    <input value={this.state.key} onChange={this.updateKey} />
                    <button onClick={this.createServer}>Create server</button>
                    <button onClick={this.joinServer}>Join server</button>
                </div>
                <br />
                <div>
                    Imploding puppies is based on <a href="https://explodingkittens.com/">Exploding kittens</a>.
                    You can read how to play the game <a href="https://explodingkittens.com/downloads/rules/Exploding_Kittens_Rules.pdf">here</a>.
                </div>
            </div>
        );
    }

    renderError() {
        return (
            <div>
                <p>{this.state.server!.error}</p>
                <button onClick={this.reset}>Back</button>
            </div>
        );
    }

    renderLoader() {
        return <div className="spinner"><i className="icon-spin1 animate-spin" /></div>
    }

    renderLobby() {
        const { className, ...rest } = this.props;
        const info = GameData.getDeckInfo(this.state.server!.players.length);

        return (
            <div className={classNames('server-lobby', 'imploding-puppies-game', className)} {...rest}>
                <h3>Lobby ({this.state.server!.players.length}/{GameData.MAX_PLAYER_COUNT})</h3>
                <div className="server-row">
                    <div className="players">
                        {this.state.server!.players.map(player => (
                            <div className="player player-avatar" key={player.id} style={{ background: player.color }}>
                                <span className="avatar">{player.avatar}</span>
                                <span className="name" title={player.name}>{player.name}</span>
                                {this.state.server!.isHost ? <span className="host-actions"><i className="icon-logout" title="Kick" onClick={this.kick(player)} /></span> : null}
                            </div>
                        ))}

                        {this.state.server!.players.length < GameData.MAX_PLAYER_COUNT ? (
                            <div className="player player-avatar loader">
                                <span className="avatar"><i className="icon-spin1 animate-spin" /></span>
                            </div>
                        ) : null}
                    </div>

                    {this.state.server!.isHost ? <div className="admin-buttons">
                        <button
                            className="force-start"
                            disabled={this.state.server!.players.length < GameData.MIN_PLAYER_COUNT}
                            onClick={(this.state.server as ServerData).start}>
                            Force start
                    </button>
                        <button
                            className="add-ai"
                            disabled={this.state.server!.players.length >= GameData.MAX_PLAYER_COUNT}
                            onClick={(this.state.server as ServerData).addAI}>
                            Add bot
                    </button>
                    </div> : null}
                </div>

                <div className="lobby-info">
                    {info.decks} deck(s) will be used to play with {this.state.server!.players.length} player(s).
                    There will be {info.deckSize} cards in the deck, including {info.bomb} imploding puppies ({cards.get(CardTypes.BOMB)!.icon})
                    and {info.defuse} defuses ({cards.get(CardTypes.DEFUSE)!.icon})!
                </div>
            </div>
        );
    }

    renderGame() {
        return <Game server={this.state.server!} />
    }

    render() {
        if (!this.state.server) {
            return this.renderForm();
        } else if (this.state.server.error) {
            return this.renderError();
        } else if (!this.state.server.connected) {
            return this.renderLoader();
        } else if (!this.state.server.started) {
            return this.renderLobby();
        } else {
            return this.renderGame();
        }
    }
}

export default Server;
