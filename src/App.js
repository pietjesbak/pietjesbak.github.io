import './css/App.css';
import { auth } from './Firebase.js';
import { HashRouter, Route, Switch } from 'react-router-dom';
import BggList from './BggList.js';
import BggRequests from './BggRequests.js';
import Facebook from './Facebook.js';
import IconButton from './IconButton.js';
import IconLink from './IconLink.js';
import inventory from './data/Inventory.js';
import React, { Component } from 'react';
import SimpleMap from './SimpleMap.js';
import Tooltip from 'react-simple-tooltip';
import ScrollToTop from './ScrollToTop';

class App extends Component {
    constructor() {
        super();
        this.state = {
            username: ''
        };
    }

    componentDidMount() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.setState({ username: user.displayName });
            }
        });
    }

    logout = async () => {
        await inventory.logout();
        this.setState({
            nameuser: ''
        });
    }

    login = async () => {
        const user = await inventory.login();
        this.setState({
            username: user.displayName
        });
    }

    home() {
        return (
            <div>
                <Facebook></Facebook>
                <BggRequests></BggRequests>
            </div>
        );
    }

    info() {
        return (
            <div>
                <div className="card">
                    <h3>Wie zijn wij?</h3>
                    Spellenclub De pietjesbak is een spellenclub in Gent / Mariakerke. <br />
                    Elke derde vrijdag van de maand (behalve in juli en augustus) <br /><br />

                    Voor 1 € inkom is iedereen welkom om een nieuw of oud spel mee te komen spelen. <br />
                    Oud of Jong, moeilijk of makkelijk, we brengen steeds een grote variatie aan spellen mee die ter plaatse uitgelegd worden. <br />
                    We starten rond 19u30 en gaan door tot ± 23 a 24u.

                    <h3>In 't Geestje</h3>
                    <span className="location">
                        Zandloperstraat 83 <br />
                        9030 Mariakerke
                    </span>
                    <SimpleMap></SimpleMap>
                </div>
            </div>
        );
    }

    noRoute() {
        return (
            <div className="center not-found">
                <span>404</span>
                <div style={{ fontSize: 14 + "vw", whiteSpace: "nowrap" }}>¯\_(ツ)_/¯</div>
            </div>
        )
    }

    renderLoginButton() {
        if (inventory.user !== null) {
            return <IconButton subClass="logout" icon="logout" text="Log uit" placement="left" action={this.logout}></IconButton>
        } else {
            return <IconButton subClass="login" icon="login" text="Log in" placement="left" action={this.login}></IconButton>
        }
    }

    render() {
        return (
            <HashRouter className="app">
                <ScrollToTop>
                    <div className="full-height">
                        <div className="page-wrap">
                            <header>
                                <div className="wrapper">
                                    <h1>
                                        <svg id="logo" width="57" height="52">
                                            <path d="M4 25.650635094610966L16.5 4L41.5 4L54 25.650635094610966L41.5 47.30127018922193L16.5 47.30127018922193Z" strokeWidth="5" fill="#c33" stroke="#eee"></path>
                                        </svg>
                                        Spellenclub De Pietjesbak
                                </h1>
                                </div>
                            </header>
                            <div className="wrapper">
                                <nav className="menu">
                                    <ul>
                                        <li><IconLink icon="globe" to="/" text="Home"></IconLink></li>
                                        <li><IconLink icon="megaphone" to="/info" text="Info"></IconLink></li>
                                        <li><IconLink icon="puzzle" to="/games" text="Games"></IconLink></li>
                                        <li className="right">
                                            {this.renderLoginButton()}
                                        </li>
                                    </ul>
                                </nav>
                                {inventory.user !== null ?
                                    <div>
                                        <div className="user-profile">
                                            <Tooltip content={`Ingeloged als ${this.state.username}`} placement="left">
                                                <img alt={this.state.username} src={inventory.user.photoURL} />
                                            </Tooltip>
                                        </div>
                                    </div>
                                    :
                                    <div></div>
                                }
                                <Switch>
                                    <Route exact path="/" component={this.home} />
                                    <Route path="/games" render={() => <BggList></BggList>} />
                                    <Route path="/info" component={this.info} />
                                    <Route render={this.noRoute} />
                                </Switch>
                            </div>
                        </div>
                        <footer>
                            <ul className="wrapper">
                                <li>
                                    <a href="https://www.facebook.com/gezelschapsspellenpietjesbak/">
                                        <i className="icon-facebook-squared"></i>
                                        Like
                                </a>
                                </li>
                                <li>
                                    <a href="mailto:pietdecoensel@gmail.com">
                                        <i className="icon-mail-alt"></i>
                                        Contact
                                </a>
                                </li>
                            </ul>
                            <span>&copy; Spellenclub De Pietjesbak &#9679; Lennert Claeys</span>
                        </footer>
                    </div>
                </ScrollToTop>
            </HashRouter>
        );
    }
}

export default App;
