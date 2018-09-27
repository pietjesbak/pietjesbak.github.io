import { CardTypes } from './Cards';
import { Player } from './Player';
import { Server } from './Server';

function startServer(server: Server, players: Player[], count: number = 3) {
    for (let i = 0; i < count; i++) {
        players[i] = new Player([], i);
        server.join(players[i]);
    }

    server.forceStart();
}

describe('Server', () => {
    it('Works when 5 players join the server', (callback) => {
        const server = new Server(true);
        server.waitForPlayers().then(players => {
            callback();
        });

        Promise.resolve().then(() => {
            for (let i = 0; i < 5; i++) {
                server.join(new Player([], i));
            }
        });
    });

    it('Works when force start is called with less than 5 players.', (callback) => {
        const server = new Server(true);
        server.waitForPlayers().then(players => {
            callback();
        });

        Promise.resolve().then(() => {
            for (let i = 0; i < 3; i++) {
                server.join(new Player([], i));
            }

            server.forceStart();
        });
    });

    it('A player can draw a card', (callback) => {
        const server = new Server(true);
        const players: Player[] = [];

        Server.prototype.nextTurn = jest.fn(() => true);
        Server.prototype.playerDraw = jest.fn();
        Server.prototype.playerPlay = jest.fn();
        Player.prototype.giveOptions = jest.fn((drawFn: () => void) => drawFn());

        Promise.resolve().then(() => {
            server.gameLoop().then(() => {
                expect(server.playerDraw).toBeCalled();
                expect(server.playerPlay).not.toBeCalled();
                expect(server.nextTurn).toBeCalled();

                callback();
            });

            startServer(server, players);
        });
    });

    it('A player can play one or more cards', (callback) => {
        const server = new Server(true);
        const players: Player[] = [];

        let turn = 0;

        Server.prototype.nextTurn = jest.fn(() => turn > 1);
        Server.prototype.playerDraw = jest.fn();
        Server.prototype.playerPlay = jest.fn();
        Player.prototype.giveOptions = jest.fn((drawFn: () => void, playFn: (selection: CardTypes[]) => void) => {
            if (turn === 0) {
                playFn([CardTypes.ATTACK]);
            } else {
                playFn([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
            }
            turn++;
        });

        Promise.resolve().then(() => {
            server.gameLoop().then(() => {
                expect(server.playerDraw).not.toBeCalled();
                expect(server.playerPlay).toHaveBeenCalledTimes(2);
                expect(server.playerPlay).toBeCalledWith([CardTypes.ATTACK]);
                expect(server.playerPlay).toBeCalledWith([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
                expect(server.nextTurn).toBeCalled();

                callback();
            });

            startServer(server, players);
        });
    });

    it('Noping should only be possible during the timeout', (callback) => {
        const server = new Server(true);
        const players: Player[] = [];

        Server.NOPE_TIMEOUT_MILLIS = 10;
        Player.prototype.allowNope = jest.fn();

        server.waitForPlayers().then(players_ => {
            server['players_'] = players_;

            server.processNopes().then(pass => {
                expect(pass).toBe(true);
                expect(Player.prototype.allowNope).toHaveBeenCalledTimes(2);

                callback();
            });
        });

        startServer(server, players);
    });

    it('It should be possible to nope a card', (callback) => {
        const server = new Server(true);
        const players: Player[] = [];
        const nopes: Array<() => void> = [];

        Server.NOPE_TIMEOUT_MILLIS = 10;
        Player.prototype.allowNope = jest.fn((fn: () => void) => nopes.push(fn));

        server.waitForPlayers().then(players_ => {
            server['players_'] = players_;

            const promise = server.processNopes();

            expect(nopes).toHaveLength(2);
            nopes[0]();

            promise.then(pass => {
                expect(pass).toBe(false);

                callback();
            });
        });

        startServer(server, players);
    });

    it('It should be possible to nope a nope', (callback) => {
        const server = new Server(true);
        const players: Player[] = [];
        const nopes = new Map<number, () => void>();

        Server.NOPE_TIMEOUT_MILLIS = 10;
        Player.prototype.allowNope = jest.fn(function(this: Player, fn: () => void) { nopes.set(this.id, fn) });

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

                callback();
            });
        });

        startServer(server, players);
    });
});
