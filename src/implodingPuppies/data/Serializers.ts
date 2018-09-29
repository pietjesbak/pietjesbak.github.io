import { Card } from './Cards';
import { Game } from './Game';
import { Player } from './Player';

export interface GameState {
    players: Player[],
    deck: Card[],
    discardPile: Card[]
}
export interface ISerializer {
    serializeFull: (server: Game) => Promise<object | void>;
    deserializeFull: () => Promise<GameState>;
}

export class TestSerializer implements ISerializer {
    private queue_: GameState[] = [];
    private deserializeHandler_: ((state: GameState) => void) | undefined;

    queueState(state: GameState) {
        if (this.deserializeHandler_ !== undefined) {
            this.deserializeHandler_(state);
            this.deserializeHandler_ = undefined;
        } else {
            this.queue_.push(state);
        }
    }

    serializeFull(server: Game) {
        return Promise.resolve({
            players: server.players.map(player => this.serializePlayer(player)),
            deck: server.deck.cards.map(card => this.serializeCard(card)),
            discardPile: server.discardPile.map(card => this.serializeCard(card))
        });
    }

    serializePlayer(player: Player): object {
        return {
            id: player.id,
            alive: player.alive,
            selection: player.selection.map(card => this.serializeCard(card)),
            cards: player.cards.map(card => this.serializeCard(card))
        }
    }

    serializeCard(card: Card): object {
        return {
            id: card.id,
            type: card.prototype.type
        };
    }

    async deserializeFull() {
        const state = this.queue_.pop();
        if (state !== undefined) {
            return Promise.resolve(state);
        } else {
            return new Promise<GameState>(resolve => {
                this.deserializeHandler_ = resolve;
            });
        }
    }
}

export class FirebaseSerializer implements ISerializer {
    serializeFull(server: Game) {
        throw new Error('WIP');
        return Promise.resolve({});
    }

    deserializeFull() {
        throw new Error('WIP');
        return Promise.resolve({
            players: [],
            deck: [],
            discardPile: []
        });
    }
}
