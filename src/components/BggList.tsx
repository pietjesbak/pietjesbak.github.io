import '../css/Games.css';

// import Pager from 'react-pager';
import * as escapeStringRegexp from 'escape-string-regexp';
import * as React from 'react';
import { BggGameData } from '../data/BggData';
import { CORS_ANYWHERE_DYNO } from '../data/Constants';
import inventory, { ChangeEvent } from '../data/Inventory';
import BggGame from './BggGame';
import { Container } from './Container';

export interface State {
    games: Map<number, BggGameData> | null;
    filteredGames: BggGameData[];
    page: number;
    gamesPerPage: number;
    search: {q: string, o: number};
    error: boolean;
    defaultExpands: number[];
    loaderDots: string;
}

class BggList extends React.Component<React.HtmlHTMLAttributes<BggList>, State> {
    /**
     * Returns all order algorithms.
     */
    static gameOrder(): { [key: string]: (a: BggGameData, b: BggGameData) => number } {
        return {
            'Alfabetisch': (a, b) => a.name.localeCompare(b.name),
            'Aantal spelers ↑': (a, b) => (a.stats.minPlayers - b.stats.minPlayers) || (a.stats.maxPlayers - b.stats.maxPlayers),
            'Aantal spelers ↓': (a, b) => (b.stats.maxPlayers - a.stats.maxPlayers) || (b.stats.minPlayers - a.stats.minPlayers),
            'Spelduur ↑': (a, b) => (a.stats.minPlaytime! - b.stats.minPlaytime!) || (a.stats.maxPlaytime! - b.stats.maxPlaytime!),
            'Spelduur ↓': (a, b) => (b.stats.maxPlaytime! - a.stats.maxPlaytime!) || (b.stats.minPlaytime! - a.stats.minPlaytime!),
            'Publicatie': (a, b) => b.year! - a.year!,
            'Score': (a, b) => b.stats.rating - a.stats.rating
        };
    }

    /**
     * The current url.
     */
    url: URL;

    /**
     * The amount of games to draw per lazy load.
     */
    gamesPerLazyLoad: number;

    /**
     * The loader interval.
     */
    loaderInterval: number | null;

    constructor(props: React.HtmlHTMLAttributes<BggList>) {
        super(props);
        this.url = new URL(window.location.href);

        // Fuck you, Edge
        // This won't work but at least it doesn't crash.
        if (this.url.searchParams === undefined) {
            console.log('Please use a real browser ლ(ಠ益ಠლ)');
            // @ts-ignore
            this.url.searchParams = new Map();
        }

        this.gamesPerLazyLoad = 5;

        this.state = {
            defaultExpands: [],
            error: false,
            filteredGames: [],
            games: null,
            gamesPerPage: this.gamesPerLazyLoad,
            loaderDots: '',
            page: Number(this.url.searchParams.get('p')) || 0,
            search: {
                o: 0,
                q: ''
            },
        };

        this.loaderInterval = null;

        // Make sure the dyno is running.
        fetch(CORS_ANYWHERE_DYNO);
    }

    componentDidMount() {
        this.progressDots();
        inventory.addChangeListener(ChangeEvent.GAME_DATA, this.updateGames);

        window.addEventListener('scroll', this.lazyLoader);
        window.addEventListener('resize', this.lazyLoader);
    }

    componentWillUnmount() {
        if (this.loaderInterval !== null) {
            clearInterval(this.loaderInterval);
        }

        window.removeEventListener('scroll', this.lazyLoader);
        window.removeEventListener('resize', this.lazyLoader);

        inventory.removeChangeListener(ChangeEvent.GAME_DATA, this.updateGames);
    }

    componentDidUpdate() {
        // So a bigger list is loaded on high screens.
        this.lazyLoader();
    }

    updateGames = (games: Map<number, BggGameData>) => {
        this.setState({ games });
        this.onPageChanged(this.state.page);
    }

    lazyLoader = () => {
        if (this.state.gamesPerPage < this.state.filteredGames.length &&
            ((document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 200 ||
                document.documentElement.scrollHeight === document.documentElement.clientHeight)
        ) {
            this.setState({ gamesPerPage: this.state.gamesPerPage + this.gamesPerLazyLoad });
        }
    }

    /**
     * Called by the pager.
     *
     * @param page The page to change to.
     */
    onPageChanged = (page: number) => {
        if (page < 0) {
            page = 0;
        }

        const filteredGames = this.filterGames();
        if (page > Math.floor(filteredGames.length / this.state.gamesPerPage)) {
            page = Math.floor(filteredGames.length / this.state.gamesPerPage);
        }

        this.url.searchParams.set('p', String(page));
        // window.history.replaceState(null, null, this.url.toString());

        this.setState({
            page,
            filteredGames
        });
    }

    progressDots() {
        if (this.state.games === null) {
            let loaderDots = this.state.loaderDots;
            if (loaderDots.length >= 3) {
                loaderDots = '';
            }

            loaderDots += '.';
            this.setState({ loaderDots });
            this.loaderInterval = window.setTimeout(this.progressDots.bind(this), 300);
        }
    }

    searchChange = async (e: React.ChangeEvent) => {
        const search = Object.assign({}, this.state.search);
        search[(e.target as HTMLInputElement).dataset.key!] = (e.target as HTMLInputElement).value;
        await this.setState({
            search,
            gamesPerPage: this.gamesPerLazyLoad,
            defaultExpands: []
        });
        this.onPageChanged(this.state.page);
    }

    searchExpansion = async (expansionId: number) => {
        const expansion = (await inventory.getGames()).get(expansionId);
        if (expansion !== undefined) {
            (this.refs.input as HTMLInputElement).value = expansion.name;
            await this.setState({
                search: { q: expansion.name, o: 0 },
                gamesPerPage: this.gamesPerLazyLoad,
                defaultExpands: [expansionId],
                filteredGames: [expansion],
                page: 0
            });
        }
    }

    /**
     * Filters and sorts the games.
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
        return (
            <Container>
                <h2>De spellencollectie wordt van <a href="https://boardgamegeek.com/user/de%20pietjesbak/games">Boardgamegeek</a> gehaald.</h2>
                <span>Dit kan even duren{this.state.loaderDots}</span>
            </Container>
        );
    }

    renderError() {
        return (
            <Container error={true}>
                <h2>Er is iets misgelopen!</h2>
                <span>Je kan de pagina proberen herladen, stuur ons gerust een mailtje als het blijft gebeuren!</span>
            </Container>
        );
    }

    renderGames() {
        const gamesOnPage = this.state.filteredGames.slice(this.state.page * this.state.gamesPerPage, this.state.page * this.state.gamesPerPage + this.state.gamesPerPage);
        let list;
        if (this.state.filteredGames.length === 0) {
            list = <h3 className="no-results">Geen resultaten!</h3>
        } else {
            list = <ul className="games">
                {gamesOnPage.map(game => <BggGame
                    key={game.id}
                    game={game}
                    expanded={this.state.defaultExpands.indexOf(game.id) !== -1}
                    expansionClick={this.searchExpansion}
                />)}
                {this.state.filteredGames.length > this.state.gamesPerPage ? (
                    <li className="spinner">
                        <i className="icon-spin1 animate-spin" />
                    </li>
                ) : ""}
            </ul>
        }

        return (
            <div className="bgg-list">
                <div className="searchbar">
                    <h3>Zoeken</h3>
                    <input type="text" className="search" data-key="q" onChange={this.searchChange} ref="input" />
                    <select className="order" data-key="o" onChange={this.searchChange}>
                        {Object.keys(BggList.gameOrder()).map((order, i) => <option key={i} value={i}>{order}</option>)}
                    </select>
                    <p className="matches">{this.state.filteredGames.length} {this.state.filteredGames.length === 1 ? "spel" : "spellen"}</p>
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
