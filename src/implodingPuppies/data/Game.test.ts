import { repeat } from '../../Helpers';
import { Card, CardTypes } from './Cards';
import { Game } from './Game';
import { Player } from './Player';
import { TestSerializer } from './Serializers';

function startServer(server: Game, players: Player[], count: number = 3) {
    for (let i = 0; i < count; i++) {
        players[i] = new Player([], i);
        server.join(players[i]);
    }

    return server.forceStart()!.catch(reject => reject);
}

describe('Server', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Works when 5 players join the server', (callback) => {
        const server = new Game(true);
        server.waitForPlayers().then(players => {
            server.shutDown();
            callback();
        });

        for (let i = 0; i < 5; i++) {
            server.join(new Player([], i));
        }
    });

    it('Works when force start is called with less than 5 players.', (callback) => {
        const server = new Game(true);
        server.waitForPlayers().then(players => {
            callback();
        });

        for (let i = 0; i < 3; i++) {
            server.join(new Player([], i));
        }

        server.forceStart();
    });

    it('A player can draw a card', (callback) => {
        const server = new Game(true);
        const players: Player[] = [];

        let first = true;
        jest.spyOn(Game.prototype, 'playerDraw');
        jest.spyOn(Game.prototype, 'playerPlay');
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void) => {
            first ? drawFn() : server.shutDown();
            first = false;
        });

        server.gameLoop().then(() => {
            expect(server.playerDraw).toBeCalled();
            expect(server.playerPlay).not.toBeCalled();

            callback();
        });

        startServer(server, players);
    });

    it('A player can play one or more cards', (callback) => {
        const server = new Game(true);
        const players: Player[] = [];

        let turn = 0;
        jest.spyOn(Game.prototype, 'playerDraw');
        jest.spyOn(Game.prototype, 'playerPlay');
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void, playFn: (selection: CardTypes[]) => void) => {
            if (turn === 0) {
                playFn([CardTypes.ATTACK]);
            } else if (turn === 1) {
                playFn([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
            } else {
                server.shutDown();
            }
            turn++;
        });

        server.gameLoop().then(() => {
            expect(server.playerDraw).not.toBeCalled();
            expect(server.playerPlay).toHaveBeenCalledTimes(2);
            expect(server.playerPlay).toBeCalledWith([CardTypes.ATTACK]);
            expect(server.playerPlay).toBeCalledWith([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);

            callback();
        });

        startServer(server, players);
    });

    it('Noping should only be possible during the timeout', (callback) => {
        const server = new Game(true);
        const players: Player[] = [];

        Game.NOPE_TIMEOUT_MILLIS = 10;
        jest.spyOn(Player.prototype, 'allowNope');

        server.waitForPlayers().then(players_ => {
            server['players_'] = players_;

            server.processNopes().then(pass => {
                expect(pass).toBe(true);
                expect(Player.prototype.allowNope).toHaveBeenCalledTimes(2);

                server.shutDown();
                callback();
            });
        });

        startServer(server, players);
    });

    it('It should be possible to nope a card', (callback) => {
        const server = new Game(true);
        const players: Player[] = [];
        const nopes: Array<() => void> = [];

        Game.NOPE_TIMEOUT_MILLIS = 10;
        jest.spyOn(Player.prototype, 'allowNope').mockImplementation((fn: () => void) => nopes.push(fn));

        server.waitForPlayers().then(players_ => {
            server['players_'] = players_;

            const promise = server.processNopes();

            expect(nopes).toHaveLength(2);
            nopes[0]();

            promise.then(pass => {
                expect(pass).toBe(false);

                server.shutDown();
                callback();
            });
        });

        startServer(server, players);
    });

    it('It should be possible to nope a nope', (callback) => {
        const server = new Game(true);
        const players: Player[] = [];
        const nopes = new Map<number, () => void>();

        Game.NOPE_TIMEOUT_MILLIS = 10;
        jest.spyOn(Player.prototype, 'allowNope').mockImplementation(function (this: Player, fn: () => void) { nopes.set(this.id, fn) });

        server.waitForPlayers().then(players_ => {
            server['players_'] = players_;

            const promise = server.processNopes();

            expect([...nopes.keys()]).toEqual([1, 2]);
            nopes.get(1)!.call(null);
            nopes.clear();

            setTimeout(() => {
                expect([...nopes.keys()]).toEqual([0, 2]);
                nopes.get(0)!.call(null);
                nopes.clear();
            }, 0);

            promise.then(pass => {
                expect([...nopes.keys()]).toEqual([1, 2]);
                expect(Player.prototype.allowNope).toHaveBeenCalledTimes(6);
                expect(pass).toBe(true);

                server.shutDown();
                callback();
            });
        });

        startServer(server, players);
    });

    it('A player plays a defuse when drawing a bomb', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void) => {
            first ? drawFn() : server.shutDown();
            first = false;
        });

        server.gameLoop().then(() => {
            expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE, CardTypes.BOMB]);

            callback();
        });

        startServer(server, players).then(() => {
            (server['serializer_'] as TestSerializer).queueState({
                players: repeat(3).map((unused, i) => new Player([new Card(CardTypes.DEFUSE)], i)),
                deck: [new Card(CardTypes.BOMB)],
                discardPile: []
            });
        });
    });
});
