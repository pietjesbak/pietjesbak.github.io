import * as Peer from 'peerjs';
import { CardTypes } from './Cards';
import { Connection, DataType, PeerBase } from './PeerBase';
import { Player } from './Player';

export class Server extends PeerBase {
    constructor(key: string) {
        super(true, key);
        this.game_.gameLoop();

        this.peer_.on('connection', (conn) => {
            conn.on('data', this.onData_(this.peer_, conn));
            conn.on('close', () => {
                console.log('connection lost');
                this.removePeer_(this.peer_);
                this.peer_.destroy();
            });
        });
    }

    get isHost() {
        return true;
    }

    get connected() {
        return !this.error_ && this.connections_.length > 0;
    }

    start = () => {
        if (this.players.length >= 2) {
            this.game_.forceStart();
            this.started_ = true;
            this.update_();

            this.broadcast_({
                type: DataType.START
            });
        }
    }

    /**
     * Creates a player to be used by the server and returns it.
     * @param name The player name.
     */
    connectSelf(name: string) {
        const player = new Player(name, this.connections_.length);

        this.connections_.push({
            player,
            peer: undefined,
            callbacks: {}
        });

        this.game_.join(player);
        return player;
    }

    /**
     * Handle all data that is sent from the client to the server.
     */
    private onData_ = (peer: Peer, connection: PeerJs.DataConnection) => (data: any) => {
        let conn: Connection | undefined;
        switch (data.type) {
            case DataType.JOIN:
                // You can only join once.
                if (this.findConnection_(peer) || this.started_) {
                    connection.close();
                    return;
                }

                conn = {
                    peer,
                    connection,
                    player: new Player(data.name, this.connections_.length),
                    callbacks: {}
                };

                this.broadcast_({
                    type: DataType.JOIN,
                    id: conn.player.id,
                    name: conn.player.name
                });

                this.game_.join(conn.player);

                this.connections_.push(conn);
                this.setPlayerCallbacks_(conn.player, conn);
                this.syncPlayers_(connection);

                this.update_();
                if (this.players.length >= 5) {
                    this.start();
                }
                break;

            case DataType.LEAVE:
                connection.close();
                this.removePeer_(peer);
                break;

            // call the correct callback.
            case DataType.DRAW:
                if (conn !== undefined && conn.callbacks.drawCallback !== undefined) {
                    conn.callbacks.drawCallback();
                }
                break;

            case DataType.PLAY:
                if (conn !== undefined && conn.callbacks.playCallback !== undefined) {
                    conn.callbacks.playCallback(data.selection);
                }
                break;

            case DataType.NOPE:
                if (conn !== undefined && conn.callbacks.nopeCallback !== undefined) {
                    conn.callbacks.nopeCallback();
                }
                break;

            case DataType.PLAYER_SELECT:
                if (conn !== undefined && conn.callbacks.playerSelectCallback !== undefined) {
                    conn.callbacks.playerSelectCallback(data.player);
                }
                break;

            case DataType.CARD_SELECT:
                if (conn !== undefined && conn.callbacks.cardSelectCallback !== undefined) {
                    conn.callbacks.cardSelectCallback(data.cardType);
                }
                break;

            case DataType.INSERT_CARD:
                if (conn !== undefined && conn.callbacks.insertCallback !== undefined) {
                    conn.callbacks.insertCallback(data.position);
                }
                break;

            case DataType.CONFIRM:
                if (conn !== undefined && conn.callbacks.confirmCallback !== undefined) {
                    conn.callbacks.confirmCallback();
                }
                break;
        }
    }

    private syncPlayers_(connection: Peer.DataConnection) {
        connection.send({
            type: DataType.UPDATE,
            players: this.players.map(player => {
                return {
                    id: player.id,
                    name: player.name
                };
            })
        });
    }

    /**
     * Adds callbacks to the remote player.
     * @param player The remote player.
     * @param connection The connection object.
     */
    private setPlayerCallbacks_(player: Player, connection: Connection) {
        player.setCallbacks({
            giveOptions: (drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) => {
                connection.callbacks = {
                    drawCallback,
                    playCallback
                };

                connection.connection!.send({
                    type: DataType.GIVE_OPTIONS
                });
            },
            allowNope: (nopeCallback: () => void) => {
                connection.callbacks = {
                    nopeCallback
                }

                connection.connection!.send({
                    type: DataType.NOPE
                });
            },
            allowSelectTarget: (options: Player[], playerSelectCallback: (player: Player) => void) => {
                connection.callbacks = {
                    playerSelectCallback
                }

                connection.connection!.send({
                    type: DataType.PLAYER_SELECT,
                    players: options.map(p => p.id)
                });
            },
            allowSelectCard: (options: CardTypes[], cardSelectCallback: (selection: CardTypes) => void) => {
                connection.callbacks = {
                    cardSelectCallback
                }

                connection.connection!.send({
                    type: DataType.CARD_SELECT,
                    cards: options
                });
            },
            allowInsertIntoDeck: (maxPosition: number, insertCallback: (position: number) => void) => {
                connection.callbacks = {
                    insertCallback
                }

                connection.connection!.send({
                    type: DataType.INSERT_CARD,
                    position: maxPosition
                });
            },
            seeFuture: (cards: CardTypes[], confirmCallback: () => void) => {
                connection.callbacks = {
                    confirmCallback
                }

                connection.connection!.send({
                    type: DataType.SEE_FUTURE,
                    future: cards
                });
            },
            clearCallbacks: () => {
                connection.callbacks = {};
                connection.connection!.send({
                    type: DataType.CLEAR
                });
            }
        });
    }
}
