import './css/Server.css';

import classNames from 'classnames';
import * as React from 'react';
import { Client as ClientData } from './data/Client';
import { PeerBase } from './data/PeerBase';
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

    renderForm() {
        const { className, ...rest } = this.props;
        return (
            <div className={classNames('server-dialog', className)} {...rest}>
                <h3>Join or create a server</h3>
                <div>
                    <h4>Name:</h4>
                    <input autoFocus={true} value={this.state.name} onChange={this.updateName} />
                </div>
                <div>
                    <h4>Key:</h4>
                    <input value={this.state.key} onChange={this.updateKey} />
                    <button onClick={this.createServer}>Create server</button>
                    <button onClick={this.joinServer}>Join server</button>
                </div>
            </div>
        );
    }

    renderError() {
        return (
            <div>{this.state.server!.error}</div>
        );
    }

    renderLoader() {
        return <div className="spinner"><i className="icon-spin1 animate-spin" /></div>
    }

    renderLobby() {
        const { className, ...rest } = this.props;
        return (
            <div className={classNames('server-lobby', 'imploding-puppies-game', className)} {...rest}>
                <h3>Waiting for players...</h3>
                {this.state.server!.players.map(player => (
                    <div className="player player-avatar" key={player.id} style={{ background: player.color }}>
                        <span className="avatar">{player.avatar}</span>
                        <span className="name">{player.name}</span>
                    </div>
                ))}

                {this.state.server!.isHost ? <button
                    className="force-start"
                    disabled={this.state.server!.players.length < 2}
                    onClick={(this.state.server as ServerData).start}>
                    Force start
                    </button> : null}
            </div>
        );
    }

    renderGame() {
        return <Game playerCount={5} server={this.state.server!} />
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
