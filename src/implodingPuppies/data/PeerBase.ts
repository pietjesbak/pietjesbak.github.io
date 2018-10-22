import * as Peer from 'peerjs';
import { CardTypes } from './Cards';
import { Game } from './Game';
import { IPlayerCallbacks } from './IPlayerCallbacks';
import { Player } from './Player';

export interface Connection {
    player: Player;
    connection?: DataConnection;
    callbacks: Partial<IPlayerCallbacks>;
}

export interface DataConnection {
    close(): void;
    send(data: PeerData): void;
    on(event: 'data', cb: (data: PeerData) => void): void;
    on(event: 'close', cb: () => void): void;
}

export interface PeerData {
    type: DataType;
    [key: string]: any;
}

export const enum DataType {
    JOIN,
    LEAVE,
    PLAY,
    DRAW,
    NOPE,
    PLAYER_SELECT,
    CARD_SELECT,
    INSERT_CARD,
    CONFIRM,
    GIVE_OPTIONS,
    SEE_FUTURE,
    CLEAR,
    UPDATE_STATE,
    LOG,
    ANNOUNCEMENT
}

export interface DiscardData {
    type: CardTypes;
    owner: number;
}

export abstract class PeerBase {
    static PREFIX = 'ImplPup';

    static DEBUG_LEVEL = 0;

    protected peer_?: Peer;

    protected game_: Game;

    protected error_: string;

    protected connections_: Connection[] = [];

    protected started_: boolean;

    protected currentPlayer_?: number;

    protected ownId_: number;

    protected updateCallback_?: () => void;

    constructor(isHost: boolean, key?: string, offline?: boolean) {
        this.game_ = new Game(isHost);
        this.game.setUpdateCallback(() => {
            this.update_();
        });

        if (offline !== true) {
            if (key === undefined) {
                this.peer_ = new Peer({ debug: PeerBase.DEBUG_LEVEL });
            } else {
                this.peer_ = new Peer(PeerBase.PREFIX + key, { debug: PeerBase.DEBUG_LEVEL });
            }
            this.peer_.on('error', this.onError_(this.peer_));
        }
    }

    abstract get isHost(): boolean;

    abstract get connected(): boolean;

    get game() {
        return this.game_;
    }

    get error() {
        return this.error_;
    }

    get started() {
        return this.started_;
    }

    get players() {
        return this.connections_.map(connection => connection.player);
    }

    get currentPlayerId() {
        return this.currentPlayer_ || this.game_.currentPlayer.id;
    }

    get ownId() {
        return this.ownId_;
    }

    abstract connectSelf(name: string): void;

    shutDown() {
        this.game.shutDown();
    }

    setUpdateCallback(callback: () => void) {
        this.updateCallback_ = callback;
    }

    protected findConnection_(connection: DataConnection | Player) {
        if (connection instanceof Player) {
            return this.connections_.find(conn => conn.player === connection);
        } else {
            return this.connections_.find(conn => conn.connection! === connection);
        }
    }

    protected removePeer_(connection: DataConnection | Player) {
        const conn = this.findConnection_(connection);
        if (conn !== undefined) {
            this.connections_.splice(this.connections_.indexOf(conn, 1), 1);
        }

        this.connections_.forEach((data, i) => data.player.id = i);
    }

    /**
     * Broadcast data to all remote peers.
     * @param data A data object or a function to get the data object.
     */
    protected broadcast_(data: ((connection: Connection) => object) | object) {
        this.connections_
            .filter(conn => conn.connection !== undefined)
            .forEach(conn => conn.connection!.send(typeof data === 'function' ? data.call(this, conn) : data));
    }

    protected onError_ = (peer: Peer) => (error: any) => {
        this.error_ = error.type;
        this.update_();
    }

    protected update_() {
        if (this.updateCallback_ !== undefined) {
            this.updateCallback_();
        }
    }
}
