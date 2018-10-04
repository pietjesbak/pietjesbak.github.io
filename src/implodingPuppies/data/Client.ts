import * as Peer from 'peerjs';
import { DataType, PeerBase } from './PeerBase';
import { Player } from './Player';

export class Client extends PeerBase {
    private name_?: string;

    private serverConnection_: Peer.DataConnection;

    constructor(key: string) {
        super(false);

        this.serverConnection_ = this.peer_.connect(PeerBase.PREFIX + key);
        this.serverConnection_.on('open', () => {
            this.join_(this.serverConnection_);

            this.serverConnection_.on('data', this.onData_(this.peer_, this.serverConnection_));
            this.serverConnection_.on('close', () => {
                this.error_ = 'Connection lost';
                this.update_();
                this.peer_.destroy();
            })
        });
    }

    get isHost() {
        return false;
    }

    get connected() {
        return !this.error_ && this.connections_.length > 0;
    }

    connectSelf(name: string) {
        this.name_ = name;

        if (this.connections_.length > 0) {
            this.join_(this.connections_[0].connection!);
        }

        return new Player();
    }

    private join_(connection: Peer.DataConnection) {
        if (this.name_ !== undefined) {
            connection.send({
                type: DataType.JOIN,
                name: this.name_
            });
        }
    }

    /**
     * Handle all data that is sent from the client to the server.
     */
    private onData_ = (peer: Peer, connection: PeerJs.DataConnection) => (data: any) => {
        switch (data.type) {
            case DataType.UPDATE:
                this.connections_ = data.players.map((player: {name: string, id: number}) => {
                    return {
                        player: new Player(player.name, player.id),
                        callbacks: {}
                    };
                });
                this.update_();
                break;

            case DataType.JOIN:
                this.connections_.push({
                    player: new Player(data.name, data.id),
                    callbacks: {}
                });
                this.update_();
                break;

            case DataType.START:
                this.started_ = true;
                this.update_();
                break;

            case DataType.GIVE_OPTIONS:
                break;

            case DataType.NOPE:
                break;

            case DataType.PLAYER_SELECT:
                break;

            case DataType.CARD_SELECT:
                break;

            case DataType.INSERT_CARD:
                break;

            case DataType.SEE_FUTURE:
                break;

            case DataType.CLEAR:
                break;
        }
    }
}
