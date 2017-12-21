//import Pager from 'react-pager';
import './css/Games.css';
import * as constants from './data/Constants.js';
import * as data from './data/BggData.js';
import BggGame from './BggGame.js';
import escapeStringRegexp from 'escape-string-regexp';
import React, { Component } from 'react';

class BggList extends Component {
    constructor() {
        super();
        this.url = new URL(window.location);
        this.gamesPerLazyLoad = 5;

        this.state = {
            games: null,
            filteredGames: [],
            page: Number(this.url.searchParams.get('p')) || 0,
            gamesPerPage: this.gamesPerLazyLoad,
            search: {
                q: '',
                o: 0
            },
            error: false,
            loaderDots: ''
        };


        this.fetchInterval = null;
        this.loaderInterval = null;

        // Make sure the dyno is running.
        fetch(constants.CORS_ANYWHERE_DYNO);
    }

    /**
     * Returns all order algorithms.
     *
     * @return {Object.<string: function(BggGameData, BggGameData): number>}
     */
    static gameOrder() {
        return {
            'Alfabetisch': (a, b) => a.name.localeCompare(b.name),
            'Score': (a, b) => b.stats.rating - a.stats.rating,
            'Aantal spelers ↑': (a, b) => a.stats.minPlayers - b.stats.minPlayers,
            'Aantal spelers ↓': (a, b) => b.stats.maxPlayers - a.stats.maxPlayers,
            'Spelduur ↑': (a, b) => a.stats.minPlaytime - b.stats.minPlaytime,
            'Spelduur ↓': (a, b) => a.stats.maxPlaytime - b.stats.maxPlaytime
        };
    }

    componentDidMount() {
        this.progressDots();
        this.fetchItems();

        window.addEventListener('scroll', this.lazyLoader);
        window.addEventListener('resize', this.lazyLoader);
    }

    componentWillUnmount() {
        clearInterval(this.fetchInterval);
        clearInterval(this.loaderInterval);

        window.removeEventListener('scroll', this.lazyLoader);
        window.removeEventListener('resize', this.lazyLoader);
    }

    componentDidUpdate() {
        // So a bigger list is loaded on high screens.
        this.lazyLoader();
    }

    lazyLoader = () => {
        if (this.state.gamesPerPage < this.state.filteredGames.length &&
            (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight * 0.9 ||
            document.documentElement.scrollHeight === document.documentElement.clientHeight)
        ) {
            this.setState({ gamesPerPage: this.state.gamesPerPage + this.gamesPerLazyLoad });
        }
    }

    async fetchItems() {
        try {
            let response = await fetch(constants.PIETJESBAK_BBG_COLLECTION);
            if (response.status !== 200) {
                this.fetchInterval = window.setTimeout(this.fetchItems.bind(this), 2000);
                return;
            }

            let xml = new DOMParser().parseFromString(await response.text(), 'text/xml');

            let games = new Map();
            for (let child of xml.children[0].children) {
                let game = new data.BggGameData(child);
                games.set(game.id, game);
            }

            this.setState({ games: games });
            this.onPageChanged(this.state.page);
        } catch (e) {
            this.setState({ error: true });
            console.error(e);
        }
    }

    /**
     * Called by the pager.
     *
     * @param {number} page The page to change to.
     */
    onPageChanged = (page) => {
        if (page < 0) {
            page = 0;
        }

        const filteredGames = this.filterGames();
        if (page > Math.floor(filteredGames.length / this.state.gamesPerPage)) {
            page = Math.floor(filteredGames.length / this.state.gamesPerPage);
        }

        this.url.searchParams.set('p', String(page));
        window.history.replaceState(null, null, this.url.toString());

        this.setState({
            page: page,
            filteredGames: filteredGames
        });
    }

    progressDots() {
        if (this.state.games === null) {
            let loaderDots = this.state.loaderDots;
            if (loaderDots.length >= 3) {
                loaderDots = '';
            }

            loaderDots += '.';
            this.setState({ loaderDots: loaderDots });
            this.loaderInterval = window.setTimeout(this.progressDots.bind(this), 500);
        }
    }

    searchChange = async (e) => {
        const search = Object.assign({}, this.state.search);
        search[e.target.dataset.key] = e.target.value;
        await this.setState({
            search: search,
            gamesPerPage: this.gamesPerLazyLoad
         });
        this.onPageChanged(this.state.page);
    }

    /**
     * Filters and sorts the games.
     *
     * @return {Array.<BggGameData>}
     */
    filterGames() {
        if (this.state.games === null) {
            return [];
        }

        let gameArr = [...this.state.games.values()];
        const re = new RegExp(escapeStringRegexp(this.state.search.q).split(' ').join('|'), 'i'); // match word or word or ...
        if (this.state.search.q !== undefined) {
            gameArr = gameArr.filter(game => game.name.search(re) !== -1);
        }

        if (this.state.search.o !== undefined) {
            const order = BggList.gameOrder();
            const index = Object.keys(order)[this.state.search.o];
            gameArr = gameArr.sort(order[index]);
        }

        return gameArr;
    }

    renderLoader() {
        return <div className="card">
            <h2>De spellencollectie wordt van <a href="https://boardgamegeek.com/user/de%20pietjesbak/games">Boardgamegeek</a> gehaald.</h2>
            <span>Dit kan even duren{this.state.loaderDots}</span>
        </div>
    }

    renderError() {
        return <div className="card error">
            <h2>Er is iets misgelopen!</h2>
            <span>Je kan de pagina proberen herladen, stuur ons gerust een mailtje als het blijft gebeuren!</span>
        </div>
    }

    renderGames() {
        let gamesOnPage = this.state.filteredGames.slice(this.state.page * this.state.gamesPerPage, this.state.page * this.state.gamesPerPage + this.state.gamesPerPage);
        let list;
        if (this.state.filteredGames.length === 0) {
            list = <p className="no-results">Geen resultaten!</p>
        } else {
            list = <ul className="games">{gamesOnPage.map(game => <BggGame key={game.id} game={game}></BggGame>)}</ul>
        }

        return (
            <div className="bgg-list">
                <div className="searchbar">
                    <h3>Zoeken</h3>
                    <input type="text" className="search" data-key="q" onChange={this.searchChange} />
                    <select className="order" data-key="o" onChange={this.searchChange}>
                        {Object.keys(BggList.gameOrder()).map((order, i) => <option key={i} value={i}>{order}</option>)}
                    </select>
                </div>
                <div className="content">
                    {list}
                    {/* <Pager
                        total={Math.ceil(this.state.filteredGames.length / this.state.gamesPerPage)}
                        current={this.state.page}
                        visiblePages={10}
                        titles={{ first: '⟵', last: '⟶' }}
                        onPageChanged={this.onPageChanged}
                    /> */}
                </div>
            </div>
        );
    }

    render() {
        if (this.state.error === true) {
            return this.renderError();
        }

        if (this.state.games === null) {
            return this.renderLoader();
        }

        return this.renderGames();
    }
}

export default BggList;
