import { Card } from './Cards';
import { Player } from './Player';
import { Server } from './Server';

export interface GameState {
    players: Player[],
    deck: Card[],
    discardPile: Card[]
}
export interface ISerializer {
    serializeFull: (server: Server) => Promise<object | void>;
    deserializeFull: (data?: object) => Promise<GameState>;
}

export class TestSerializer implements ISerializer {
    serializeFull(server: Server) {
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

    async deserializeFull(data?: object) {
        const response = {
            players: data && data['players'],
            deck: data && data['deck'],
            discardPile: data && data['discardPile']
        };

        return new Promise<typeof response>(resolve => {
            if (data && data['timeout'] !== undefined) {
                window.setTimeout(() => resolve(response), data['timeout']);
            } else {
                resolve(response);
            }
        });
    }
}

export class FirebaseSerializer implements ISerializer {
    serializeFull(server: Server) {
        throw new Error('WIP');
        return Promise.resolve({});
    }

    deserializeFull(data: object) {
        throw new Error('WIP');
        return Promise.resolve({
            players: [],
            deck: [],
            discardPile: []
        });
    }
}