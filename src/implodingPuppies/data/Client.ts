import * as Peer from 'peerjs';
import { Announcement } from './Announcement';
import { Card, CardTypes } from './Cards';
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
                this.error_ = 'You have been disconnected from the server!';
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
        let player;
        switch (data.type) {
            case DataType.JOIN:
                this.connections_ = data.players.map((p: { name: string, id: number }) => {
                    return {
                        player: new Player(p.name, p.id),
                        callbacks: {}
                    };
                });
                this.update_();
                break;

            case DataType.UPDATE_STATE:
                this.started_ = true;
                this.currentPlayer_ = data.currentPlayer;
                this.ownId_ = data.ownId;
                this.connections_.forEach((conn, i) => {
                    conn.player.id = data.players[i].id;
                    conn.player.name = data.players[i].name;
                    conn.player.cards = data.players[i].cards.map((type: CardTypes) => new Card(type));
                    conn.player.clearSelection();
                });

                this.game_.setDeckClient(data.deck);
                this.game_.setDiscardClient(data.discard);
                this.game_.setPlayersClient(this.players.sort((a, b) => a.id - b.id));
                this.update_();
                break;

            case DataType.GIVE_OPTIONS:
                player = this.players.find(p => p.id === this.ownId_)!;
                player.giveOptions(() => {
                    this.serverConnection_.send({
                        type: DataType.DRAW
                    });
                }, (selection: CardTypes[]) => {
                    this.serverConnection_.send({
                        type: DataType.PLAY,
                        selection
                    });
                });
                break;

            case DataType.NOPE:
                player = this.players.find(p => p.id === this.ownId_)!;
                player.allowNope(() => {
                    this.serverConnection_.send({
                        type: DataType.NOPE
                    });
                });
                break;

            case DataType.PLAYER_SELECT:
                const options = data.players.map((i: number) => this.players[i]);
                player = this.players.find(p => p.id === this.ownId_)!;
                player.allowSelectTarget(options, (p) => {
                    this.serverConnection_.send({
                        type: DataType.PLAYER_SELECT,
                        player: p.id
                    });
                });
                break;

            case DataType.CARD_SELECT:
                player = this.players.find(p => p.id === this.ownId_)!;
                player.allowSelectCard(data.cards, (card) => {
                    this.serverConnection_.send({
                        type: DataType.CARD_SELECT,
                        cardType: card
                    });
                });
                break;

            case DataType.INSERT_CARD:
                player = this.players.find(p => p.id === this.ownId_)!;
                player.allowInsertIntoDeck(data.position, (position) => {
                    this.serverConnection_.send({
                        type: DataType.INSERT_CARD,
                        position
                    });
                });
                break;

            case DataType.SEE_FUTURE:
                player = this.players.find(p => p.id === this.ownId_)!;
                player.seeFuture(data.future, () => {
                    this.serverConnection_.send({
                        type: DataType.CONFIRM
                    });
                });
                break;

            case DataType.CLEAR:
                player = this.players.find(p => p.id === this.ownId_)!;
                player.clearCallbacks();
                break;

            case DataType.ANNOUNCEMENT:
                this.game.announce(Announcement.deserialize(this.game, data.announcement));
                break;
        }
    }
}
