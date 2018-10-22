import { repeat } from '../../Helpers';
import { AIPlayer } from './AIPlayer';
import { Announcement } from './Announcement';
import { CardTypes } from './Cards';
import { Game } from './Game';
import { Connection, DataConnection, DataType, PeerBase, PeerData } from './PeerBase';
import { Player } from './Player';

export class Server extends PeerBase {

    constructor(key?: string) {
        super(true, key, key === undefined);
        this.game_.setAnnouncementCallback(this.announce_);

        if (this.peer_ !== undefined) {
            this.peer_.on('connection', (conn) => {
                conn.on('data', this.onData_(conn));
                conn.on('close', () => {
                    this.removePeer_(conn);
                });
            });
        }
    }

    get isHost() {
        return true;
    }

    get connected() {
        return !this.error_ && this.connections_.length > 0;
    }

    get AIPlayers() {
        return this.players.filter(player => player instanceof AIPlayer);
    }

    start = () => {
        if (this.players.length >= 2) {
            this.game.setPlayers([...this.players]);
            this.game_.gameLoop();

            this.ownId_ = this.connections_.find(conn => conn.connection === undefined)!.player.id;
            this.started_ = true;
            this.update_();
            this.game_.forceStart();
        }
    }

    /**
     * Sync the game state with all clients.
     */
    updateState = () => {
        const base = {
            type: DataType.UPDATE_STATE,
            deck: this.game_.deck.cards.length,
            discard: this.game.discardPile.map(card => ({ type: card.prototype.type, owner: card.owner.data })),
            currentPlayer: this.game.currentPlayer.id
        };

        this.broadcast_((connection: Connection) => {
            return {
                ...base,
                ownId: connection.player.id,
                players: this.players.map(player => {
                    return {
                        id: player.id,
                        name: player.name,
                        alive: player.alive,
                        cards: connection.player === player ? player.cards.map(card => card.prototype.type) : repeat(player.cards.length).map(() => CardTypes.BOMB)
                    };
                })
            };
        });
    }

    /**
     * Creates a player to be used by the server and returns it.
     * @param name The player name.
     */
    connectSelf(name: string) {
        const player = new Player(name, this.connections_.length);
        this.ownId_ = player.id;

        this.connections_.push({
            player,
            connection: undefined,
            callbacks: {}
        });
    }

    /**
     * Add an ai player.
     */
    addAI = () => {
        const connection = new AIPlayer(this.game);
        connection.on('data', this.onData_(connection));
        connection.on('close', () => {
            this.removePeer_(connection);
        });
    }

    kick(player: Player) {
        const connection = this.findConnection_(player);
        if (connection !== undefined) {
            if (connection.connection !== undefined) {
                connection.connection!.close();
            }

            this.removePeer_(player);
            this.syncPlayers_();
            this.update_();
        }
    }

    protected update_() {
        super.update_();

        if (this.started_) {
            this.updateState();
        }
    }

    /**
     * Handle all data that is sent from the client to the server.
     */
    private onData_ = (connection: DataConnection) => {
        let conn: Connection | undefined;
        return (data: PeerData) => {
            try {
                switch (data.type) {
                    case DataType.JOIN:
                        // You can only join once.
                        if (this.findConnection_(connection) || this.started_) {
                            connection.close();
                            return;
                        }

                        conn = {
                            connection,
                            player: new Player(data.name, this.connections_.length),
                            callbacks: {}
                        };

                        this.connections_.push(conn);
                        this.setPlayerCallbacks_(conn.player, conn);
                        this.syncPlayers_();

                        this.update_();
                        if (this.players.length >= Game.MAX_PLAYER_COUNT) {
                            this.start();
                        }
                        break;

                    case DataType.LEAVE:
                        connection.close();
                        this.removePeer_(connection);
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
                            conn.callbacks.playerSelectCallback(this.game.players[data.player]);
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
            } catch (e) {
                console.log(`Disconnecting player ${conn && conn.player.name} due to an error while processing their command`);
                console.error(e);
                connection.close();
            }
        }
    }

    /**
     * Announces an event to all players.
     * @param announcement The announcement.
     */
    private announce_ = (announcement: Announcement) => {
        this.broadcast_({
            type: DataType.ANNOUNCEMENT,
            announcement: announcement.serialize(this.game)
        });
    }

    /**
     * Syncs the current players with the clients.
     */
    private syncPlayers_() {
        this.broadcast_({
            type: DataType.JOIN,
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
