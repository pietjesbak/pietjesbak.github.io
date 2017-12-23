import { PIETJESBAK_BBG_COLLECTION } from './Constants';
import * as data from './BggData.js';
import firebase, { auth, provider } from '../Firebase.js';
import * as constants from './Constants.js';

class Inventory {
    constructor() {
        /**
         * A promise for all board game geek games.
         *
         * @private
         * @type {?Promise.<Map.<number, BggGameData>>}
         */
        this.fetchGamePromise_ = null;

        /**
         * A map of games you requested and their firebase key.
         *
         * @private
         * @type {?Map.<number, string>}
         */
        this.ownRequestedGames_ = null;

        /**
         * A map of all requested games and the amount of times they were requested this month.
         *
         * @private
         * @type {?Map.<number, number>}
         */
        this.requestedGames_ = null;

        /**
         * An array of callbacks for when the game lists update.
         *
         * @private
         * @type {Array.<function(Map.<number, BggGameData>)>}
         */
        this.changeListeners_ = [];

        /**
         * Your user object when logged in to firebase.
         *
         * @private
         * @type {?Object}
         */
        this.user_ = null;

        /**
         * All users of the pietjesbak. uid => name
         *
         * @private
         * @type {Map.<string, string>}
         */
        this.users_ = new Map();

        this.firebaseWaitForAuthChange_();
        this.getFirebaseRequests_();
        // this.getFirebaseUsers_();
    }

    /**
     * Get the board game collection from boardgame geek.
     *
     * @return {Promise.<Map.<number, BggGameDate>>}
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
     * @param {*} game The game to toggle.
     * @return {Promise}
     */
    async toggleGame(game) {
        const date = new Date();
        const key = this.ownRequestedGames_.get(game.id);

        if (this.user_ === null) {
            throw new Error('You need to be logged in to request a game.');
        }

        if (key === undefined) {
            // Request it.
            await firebase.database().ref(`requests/${date.getFullYear()}/${date.getMonth()}/${this.user_.uid}/`).push(game.id);
        } else {
            // Remove.
            await firebase.database().ref(`requests/${date.getFullYear()}/${date.getMonth()}/${this.user_.uid}/${key}/`).remove();
        }
    }

    /**
     * Fetches all details for a game.
     *
     * @param {BggGameData} game The game to fetch details for.
     * @return {Promise}
     */
    async fetchGameDetails(game) {
        if (game.details !== undefined) {
            return;
        }

        game.details = null;

        try {
            let games = await this.getGames();
            let response = await fetch(constants.CORS_ANYWHERE_DYNO + constants.BBG_GAME_API + game.id);
            let xml = new DOMParser().parseFromString(await response.text(), 'text/xml');

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
     * @param {function(Map.<number, BggGameData>)} listener The listener.
     * @return {Promise}
     */
    async addChangeListener(listener) {
        this.changeListeners_.push(listener);

        if (this.requestedGames_ !== null) {
            listener.call(this, await this.getGames());
        }
    }

    /**
     * Removes a listener that was added using addChangeListener.
     *
     * @param {function(Map.<number, BggGameData>)} listener The previously added listener.
     */
    removeChangeListener(listener) {
        this.changeListeners_.splice(this.changeListeners_.indexOf(listener), 1);
    }

    /**
     * Get the currently logged in user.
     *
     * @return {?Object}
     */
    get user() {
        return this.user_;
    }

    /**
     * Get all users.
     *
     * @return {Map.<number, Object>}
     */
    get users() {
        return this.users_;
    }

    /***************************************************************
     * AUTHENTICATION                                              *
     ***************************************************************/

    /**
     * Logs out from firebase.
     *
     * @returns {Promise}
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
     *
     * @return {Promise.<Object>}
     */
    login() {
        return new Promise((resolve, reject) => {
            auth.signInWithRedirect(provider).then(() => {
                auth.getRedirectResult().then(result => {
                    this.user_ = result.user;

                    resolve(this.user_);
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
    * @private
    * @param {number} ms ms to sleep.
    */
    async sleep_(ms) {
        return new Promise(resolve => {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Fetches the board game collection from boardgame geek.
     *
     * @private
     * @return {Promise.<Map.<number, BbgGameDate>>}
     */
    async fetchGames_() {
        let response;
        do {
            response = await fetch(PIETJESBAK_BBG_COLLECTION);
            if (response.status !== 200) {
                await this.sleep_(2000);
            }
        } while (response.status !== 200);

        let xml = new DOMParser().parseFromString(await response.text(), 'text/xml');

        let games = new Map();
        for (let child of xml.children[0].children) {
            let game = new data.BggGameData(child);
            games.set(game.id, game);
        }

        return games;
    }

    /**
     * Updates the user when the auth state changes.
     *
     * @private
     */
    firebaseWaitForAuthChange_() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.user_ = user;
            } else {
                this.user_ = null;
            }
        });
    }

    /**
     * Get all game requests from firebase.
     *
     * @private
     */
    async getFirebaseRequests_() {
        const date = new Date();
        firebase.database().ref(`requests/${date.getFullYear()}/${date.getMonth()}/`).on('value', async snapshot => {
            const value = snapshot.val();
            const ownUid = this.user !== null ? this.user.uid : undefined;
            this.ownRequestedGames_ = new Map();
            this.requestedGames_ = new Map();

            for (const uid in value) {
                const requests = [...new Set(Object.values(value[uid]))];
                if (uid === ownUid) {
                    const keys = Object.keys(value[uid]);
                    for (let i = 0; i < requests.length; i++) {
                        this.ownRequestedGames_.set(requests[i], keys[i]);
                    }
                }

                for (let i = 0; i < requests.length; i++) {
                    this.requestedGames_.set(requests[i], 1 + (this.requestedGames_.get(requests[i]) || 0));
                }
            }

            let games = await this.getGames();
            for (let [k, v] of games.entries()) {
                v.requestsThisMonth = this.requestedGames_.get(k) || 0;
                v.requestedByMe = this.ownRequestedGames_.has(k);
            }

            this.changeListeners_.forEach(listener => listener.call(this, games));
        });
    }

    /**
     * Get all users from firebase.
     *
     * @private
     */
    getFirebaseUsers_() {
        firebase.database().ref(`users/`).once('value', snapshot => {
            const value = snapshot.val();
            this.users_ = new Map();
            for (let uid in value) {
                this.users_.set(uid, value[uid]);
            }

            // You only have access to the users after logging in so the timing should always be right.
            if (this.user !== null && this.users_.has(this.user.uid) === false) {
                firebase.database().ref(`users/${this.user.uid}/`).set(this.user.displayName);
            }
        });
    }
}

export default new Inventory();
