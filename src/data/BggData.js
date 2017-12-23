/**
 * Little helper to filter out undefined elements.
 *
 * @param {*} element
 * @return {boolean} True if the element is not undefined.
 */
const filter = element => element !== undefined;

class BggGameData {
    /**
     * Data class that represents an item from boardgamegeek.
     *
     * @param {item} node An xml node from boardgamegeek.
     */
    constructor(node) {
        /**
         * This element's id.
         *
         * @type {number}
         */
        this.id = Number(node.attributes['objectid'].nodeValue);

        /**
         * This element's collection id.
         *
         * @type {number}
         */
        this.collectionId = Number(node.attributes['collid'].nodeValue);

        /**
         * The name of the game.
         *
         * @type {string}
         */
        this.name = node.getElementsByTagName('name')[0].childNodes[0].nodeValue;

        /**
         * The publish year.
         *
         * @type {number}
         */
        this.year = Number(node.getElementsByTagName('yearpublished')[0].childNodes[0].nodeValue);

        /**
         * Game image.
         *
         * @type {string}
         */
        this.image = node.getElementsByTagName('image')[0].childNodes[0].nodeValue;

        /**
         * Game thumbnail.
         *
         * @type {string}
         */
        this.thumbnail = node.getElementsByTagName('thumbnail')[0].childNodes[0].nodeValue;

        /**
         * Game stats.
         *
         * @type {BggStatsData}
         */
        this.stats = new BggStatsData(node.getElementsByTagName('stats')[0]);

        /**
         * Game details.
         *
         * @type {?BggDetailsData=}
         */
        this.details = undefined;

        /**
         * The amount of requests this month, not part of boardgame geek.
         * This should be filled in by firebase.
         *
         * @type {number}
         */
        this.requestsThisMonth = 0;

        /**
         * If this game was requested this month by the current use.
         * This should be filled in by firebase.
         */
        this.requestedByMe = false;
    }
}

class BggStatsData {
    /**
     * Data class that represents boardgamegeek stats.
     *
     * @param {item} node An xml node containing the stats.
     */
    constructor(node) {
        /**
         * Min players.
         *
         * @type {number}
         */
        this.minPlayers = Number(node.attributes['minplayers'].nodeValue);

        /**
         * Max players.
         *
         * @type {number}
         */
        this.maxPlayers = Number(node.attributes['maxplayers'].nodeValue);

        /**
         * Min play time.
         *
         * @type {number}
         */
        this.minPlaytime = Number(node.attributes['minplaytime'].nodeValue);

        /**
         * Max play time.
         *
         * @type {number}
         */
        this.maxPlaytime = Number(node.attributes['maxplaytime'].nodeValue);

        /**
         * Game rating.
         *
         * @type {number}
         */
        this.rating = Number(node.getElementsByTagName('average')[0].attributes['value'].nodeValue);
    }

    /**
     * Get players string.
     *
     * @returns {string}
     */
    get players() {
        if (this.minPlayers === this.maxPlayers) {
            return `${this.minPlayers} spelers`;
        }

        return `${this.minPlayers} - ${this.maxPlayers} spelers`;
    }

    /**
     * Get playtime string.
     *
     * @returns {string}
     */
    get playtime() {
        if (this.minPlaytime === this.maxPlaytime) {
            return `${this.minPlaytime} minuten`;
        }

        return `${this.minPlaytime} - ${this.maxPlaytime} minuten`;
    }
}

class BggDetailsData {
    /**
     * Data class that represents boardgamegeek details.
     *
     * @param {item}                      node  An xml node containing the details.
     * @param {Map.<number, BggGameData>} games All games.
     */
    constructor(node, games) {
        /**
         * Game description.
         *
         * @type {string}
         */
        this.description = node.getElementsByTagName('description')[0].childNodes[0].nodeValue;

        /**
         * Game categpries.
         *
         * @type {Array.<string>}
         */
        this.categories = [...node.getElementsByTagName('boardgamecategory')].filter(filter).map(element => element.childNodes[0].nodeValue);

        /**
         * Game family (theme).
         *
         * @type {string|undefined}
         */
        this.family = undefined;
        const familyNodes = node.getElementsByTagName('boardgamefamily');
        if (familyNodes.length === 1) {
            this.family = familyNodes[0].childNodes[0].nodeValue;
        }

        /**
         * Game mechanics.
         *
         * @type {Array.<string>}
         */
        this.mechanics = [...node.getElementsByTagName('boardgamemechanic')].filter(filter).map(element => element.childNodes[0].nodeValue);

        /**
         * Game expansions.
         *
         * @type {Map.<number, string>}
         */
        this.expansions = new Map();
        [...node.getElementsByTagName('boardgameexpansion')].filter(filter).forEach(element => this.expansions.set(Number(element.attributes['objectid'].nodeValue), element.childNodes[0].nodeValue));

        /**
         * Game domain (audience?).
         *
         * @type {Array.<string>}
         */
        this.domain = [...node.getElementsByTagName('boardgamesubdomain')].filter(filter).map(element => element.childNodes[0].nodeValue);

        /**
         * Owned expansions.
         *
         * @type {Map.<number, BggGameData>}
         */
        this.ownedExpansions = new Map();

        /**
         * Not owned expansions.
         *
         * @type {Map.<number, BggGameData>}
         */
        this.otherExpansions = new Map();

        this.updateOwnedExpansions(games);
    }

    /**
     * Updates the owned and other expansion maps.
     *
     * @param {Map.<number, BggGameData>} games All games.
     */
    updateOwnedExpansions(games) {
        const entries = [...this.expansions.entries()];

        this.ownedExpansions = new Map();
        entries
            .filter(id => games.has(id))
            .forEach(([id, name]) => this.ownedExpansions.set(id, name));

        this.otherExpansions = new Map();
        entries
            .filter(id => games.has(id) === false)
            .forEach(([id, name]) => this.otherExpansions.set(id, name));
    }

    /**
     * Get the description as an array of strings without html bits.
     *
     * @return {Array.<string>}
     */
    get descriptionArray() {
        const html = new DOMParser().parseFromString(this.description, 'text/html');

        let nextIsProbablyJunk = false;
        return [...html.body.childNodes].map(node => {
            // After a link there seems to be some truncated text (or a br element). Ignore that truncated text, a br returns an empty string anyways.
            if (nextIsProbablyJunk) {
                nextIsProbablyJunk = false;
                return '';
            }

            if (node.href !== undefined) {
                nextIsProbablyJunk = true;
                return node.href;
            }

            if (node.nodeValue !== null) {
                return node.nodeValue;
            }

            return '';
        });
    }
}

export {
    BggGameData,
    BggStatsData,
    BggDetailsData
};
