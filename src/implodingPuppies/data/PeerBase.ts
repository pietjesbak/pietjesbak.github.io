import * as Peer from 'peerjs';
import { Game } from './Game';
import { IPlayerCallbacks } from './IPlayerCallbacks';
import { Player } from './Player';

export interface Connection {
    player: Player;
    peer?: Peer;
    connection?: PeerJs.DataConnection;
    callbacks: Partial<IPlayerCallbacks>;
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
    UPDATE,
    START
}

export abstract class PeerBase {
    static PREFIX = 'ImplPup';

    static DEBUG_LEVEL = 0;

    protected peer_: Peer;

    protected game_: Game;

    protected error_: string;

    protected connections_: Connection[] = [];

    protected started_: boolean;

    protected updateCallback_?: () => void;

    constructor(isHost: boolean, key?: string) {
        this.game_ = new Game(isHost);

        if (key === undefined) {
            this.peer_ = new Peer({debug: PeerBase.DEBUG_LEVEL });
        } else {
            this.peer_ = new Peer(PeerBase.PREFIX + key, {debug: PeerBase.DEBUG_LEVEL });
        }
        this.peer_.on('error', this.onError_(this.peer_));
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

    abstract connectSelf(name: string): Player;

    shutDown() {
        this.game.shutDown();
    }

    setUpdateCallback(callback: () => void) {
        this.updateCallback_ = callback;
        this.game.setUpdateCallback(callback);
    }

    protected findConnection_(peer: Peer) {
        return this.connections_.find(connection => connection.peer === peer)!;
    }

    protected removePeer_(peer: Peer) {
        this.connections_.splice(this.connections_.indexOf(this.findConnection_(peer)), 1);
    }

    protected broadcast_(data: any) {
        this.connections_
            .map(conn => conn.connection)
            .filter(conn => conn !== undefined)
            .forEach(conn => conn!.send(data));
    }

    protected onError_ = (peer: Peer) => (error: any) => {
        this.removePeer_(peer);
        this.error_ = error.type;
        this.update_();
    }

    protected update_() {
        if (this.updateCallback_ !== undefined) {
            this.updateCallback_();
        }
    }
}
