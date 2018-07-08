import { auth, database, provider } from '../Firebase';
import * as data from './BggData';
import { PIETJESBAK_BBG_COLLECTION } from './Constants';
import * as constants from './Constants';

class Inventory {
    /**
     * A promise for all board game geek games.
     */
    private fetchGamePromise_: Promise<Map<number, data.BggGameData>> | null = null;

    /**
     * A map of games you requested and their firebase key.
     */
    private ownRequestedGames_: Map<number, number> | null = null;

    /**
     * A map of all requested games and the amount of times they were requested this month.
     */
    private requestedGames_: Map<number, number> | null = null;

    /**
     * An array of callbacks for when the game lists update.
     */
    private changeListeners_: Array<(map: Map<number, data.BggGameData>) => void> = [];

    /**
     * Your user object when logged in to firebase.
     */
    private user_: FirebaseUser | null = null;

    /**
     * All users of the pietjesbak. uid => name
     */
    private users_: Map<string, string> = new Map();

    /**
     * All users of the pietjesbak. uid => name
     */
    private facebookEventPromise_: Promise<FacebookEvent[]> = this.fetchFacebookEvent_();

    constructor() {
        this.firebaseWaitForAuthChange_();
        this.getFirebaseRequests_();
        // this.getFirebaseUsers_();
    }

    /**
     * Get the board game collection from boardgame geek.
     */
    async getGames() {
        if (this.fetchGamePromise_ === null) {
            this.fetchGamePromise_ = this.fetchGames_();
        }

        return await this.fetchGamePromise_;
    }

    /**
     * Toggles a request for a game. You need to be logged in for this.
     *
     *  @param game The game to toggle.
     */
    async toggleGame(game: data.BggGameData) {
        const date = (await this.getNextEventDate()).date;
        const key = this.ownRequestedGames_!.get(game.id);

        if (this.user_ === null) {
            throw new Error('You need to be logged in to request a game.');
        }

        if (key === undefined) {
            // Request it.
            await database.ref(`requests/${date.getFullYear()}/${date.getMonth()}/${this.user_.uid}/`).push(game.id);
        } else {
            // Remove.
            await database.ref(`requests/${date.getFullYear()}/${date.getMonth()}/${this.user_.uid}/${key}/`).remove();
        }
    }

    /**
     * Fetches all details for a game.
     *
     * @param game The game to fetch details for.
     */
    async fetchGameDetails(game: data.BggGameData) {
        if (game.details !== undefined) {
            return;
        }

        game.details = null;

        try {
            const games = await this.getGames();
            const response = await fetch(constants.CORS_ANYWHERE_DYNO + constants.BBG_GAME_API + game.id);
            const xml = new DOMParser().parseFromString(await response.text(), 'text/xml');

            game.details = new data.BggDetailsData(xml.children[0].children[0], games);
        } catch (e) {
            game.details = undefined; // Reset
            throw e;
        }

        return game;
    }

    /**
     * Adds a listener that gets called everytime the games change. Contains: all game requests, game requests for the current user and all games.
     *
     * @param listener The listener.
     */
    async addChangeListener(listener: (map: Map<number, data.BggGameData>) => void) {
        this.changeListeners_.push(listener);

        if (this.requestedGames_ !== null) {
            listener.call(this, await this.getGames());
        }
    }

    /**
     * Removes a listener that was added using addChangeListener.
     *
     * @param listener The previously added listener.
     */
    removeChangeListener(listener: (map: Map<number, data.BggGameData>) => void) {
        this.changeListeners_.splice(this.changeListeners_.indexOf(listener), 1);
    }

    /**
     * Get the currently logged in user.
     */
    get user() {
        return this.user_;
    }

    /**
     * Get all users.
     */
    get users() {
        return this.users_;
    }

    /**
     * Get a promise containing the most recent facebook event.
     */
    async getFacebookEvent() {
        return await this.facebookEventPromise_;
    }

    /**
     * Get a promise containing the next event date and if this date has been confirmed.
     */
    async getNextEventDate() {
        let confirmed = true;
        let startTime;

        try {
            const events = await this.getFacebookEvent();
            startTime = new Date(events[0].start_time);
        } catch (r) {
            console.error('Failed to get next event date.');
            startTime = new Date(0);
        }


        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + 1);

        // Adjust the start time if the event has passed.
        if (thresholdDate > startTime) {
            confirmed = false;
            startTime.setMonth(startTime.getMonth() + 1); // Go to the next month.
            startTime.setDate(1); // Set to first day of this month.
            startTime.setDate(2 * 7 + (6 - startTime.getDay() + 7) % 7); // Figure out when the 3rd friday is from here.
        }

        return {
            confirmed,
            date: startTime
        };
    }

    /***************************************************************
     * AUTHENTICATION                                              *
     ***************************************************************/

    /**
     * Logs out from firebase.
     */
    logout() {
        return new Promise(resolve => {
            auth.signOut().then(() => {
                this.user_ = null;
                resolve();
            });
        })
    }

    /**
     * Logs in to firebase.
     */
    login(): Promise<FirebaseUser> {
        return new Promise((resolve, reject) => {
            auth.signInWithRedirect(provider).then(() => {
                auth.getRedirectResult().then(result => {
                    this.user_ = result.user;

                    resolve(this.user_!);
                }).catch(e => {
                    console.error(e);
                    reject();
                });
            });
        });
    }

    /***************************************************************
     * PRIVATE STUFF                                               *
     ***************************************************************/

    /**
     * Wraps window.setTimeout into a promise.
     *
     * @param ms ms to sleep.
     */
    private async sleep_(ms: number) {
        return new Promise(resolve => {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Fetches the board game collection from boardgame geek.
     */
    private async fetchGames_() {
        let response;
        do {
            try {
                response = await fetch(PIETJESBAK_BBG_COLLECTION);
                if (response.status !== 200) {
                    throw new Error('Collection not yet available.');
                }
            } catch (e) {
                console.log(`Trying again in 3 seconds: ${e}`);
                await this.sleep_(3000);
            }
        } while (response === undefined || response.status !== 200);

        const xml = new DOMParser().parseFromString(await response.text(), 'text/xml');

        const games = new Map();
        for (const child of xml.children[0].children as any) {
            const game = new data.BggGameData(child);
            games.set(game.id, game);
        }

        return games;
    }

    /**
     * Updates the user when the auth state changes.
     */
    private firebaseWaitForAuthChange_() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.user_ = user as FirebaseUser;
            } else {
                this.user_ = null;
            }
        });
    }

    /**
     * Get all game requests from firebase.
     */
    private async getFirebaseRequests_() {
        const date = (await this.getNextEventDate()).date;
        database.ref(`requests/${date.getFullYear()}/${date.getMonth()}/`).on('value', async snapshot => {
            if (snapshot !== null) {
                const value = snapshot.val() as {  [key: number]: number };
                const ownUid = this.user_ !== null ? this.user_.uid : undefined;
                this.ownRequestedGames_ = new Map();
                this.requestedGames_ = new Map();

                for (const uid in value) {
                    const requests = [...new Set(Object.values(value[uid]))];
                    if (uid === ownUid) {
                        const keys = Object.keys(value[uid]);
                        for (let i = 0; i < requests.length; i++) {
                            this.ownRequestedGames_.set(requests[i], Number(keys[i]));
                        }
                    }

                    for (let i = 0; i < requests.length; i++) {
                        this.requestedGames_.set(requests[i], 1 + (this.requestedGames_.get(requests[i]) || 0));
                    }
                }

                const games = await this.getGames();
                for (const [k, v] of games.entries()) {
                    v.requestsThisMonth = this.requestedGames_.get(k) || 0;
                    v.requestedByMe = this.ownRequestedGames_.has(k);
                }

                this.changeListeners_.forEach(listener => listener.call(this, games));
            }
        });
    }

    /**
     * Get all users from firebase.
     */
    // private getFirebaseUsers_() {
    //     database.ref(`users/`).once('value', snapshot => {
    //         const value = snapshot.val();
    //         this.users_ = new Map();
    //         for (const uid in value) {
    //             this.users_.set(uid, value[uid]);
    //         }

    //         // You only have access to the users after logging in so the timing should always be right.
    //         if (this.user !== null && this.users_.has(this.user.uid) === false) {
    //             database.ref(`users/${this.user.uid}/`).set(this.user.displayName);
    //         }
    //     });
    // }

    /**
     * Get the most recent facebook event and figure out which month requests should be fetched for.
     */
    private async fetchFacebookEvent_(): Promise<FacebookEvent[]> {
        const response = await fetch(constants.FACEBOOK_PIETJESBAK_EVENTS);
        if (response.ok === false) {
            throw Error("Incorrect response");
        }

        const json = await response.json();
        return json.data;
    }
}

export default new Inventory();
