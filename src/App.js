import './css/App.css';
import { HashRouter, Route, Link, Switch } from 'react-router-dom'
import BggList from './BggList.js';
import Facebook from './Facebook.js';
import firebase, { auth, provider } from './Firebase.js';
import IconButton from './IconButton.js';
import React, { Component } from 'react';
import SimpleMap from './SimpleMap.js';
import Tooltip from "react-simple-tooltip";

class App extends Component {
    constructor() {
        super();
        this.state = {
            currentItem: '',
            username: '',
            user: null
        }
    }

    componentDidMount() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.setState({ user });
            }
        });

        //firebase.database().ref('templates').on('value', snapshot => console.log(snapshot.val()));
    }

    logout = () => {
        auth.signOut()
            .then(() => {
                this.setState({
                    user: null
                });
            });
    }

    login = () => {
        auth.signInWithRedirect(provider)
            .then((result) => {
                const user = result.user;
                this.setState({
                    user
                });
            }).catch(e => console.log(e));
    }

    home() {
        return (
            <div>
                <Facebook></Facebook>
                <SimpleMap></SimpleMap>
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
        if (this.state.user) {
            return <IconButton subClass="logout" icon="logout" text="Log uit" placement="left" action={this.logout}></IconButton>
        } else {
            return <IconButton subClass="login" icon="login" text="Log in" placement="left" action={this.login}></IconButton>
        }
    }

    render() {
        return (
            <HashRouter className='app'>
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
                                    <li><Link className="button" to="/">Over</Link></li>
                                    <li><Link className="button" to="/games">Games</Link></li>
                                    <li className="right">
                                        {this.renderLoginButton()}
                                    </li>
                                </ul>
                            </nav>
                            {this.state.user ?
                                <div>
                                    <div className="user-profile">
                                        <Tooltip content={`Ingeloged als ${this.state.user.displayName}`}>
                                            <img alt={this.state.user.displayName} src={this.state.user.photoURL} />
                                        </Tooltip>
                                    </div>
                                </div>
                                :
                                <div></div>
                            }
                            <Switch>
                                <Route exact path="/" component={this.home} />
                                <Route path="/games" render={() => <BggList></BggList>} />
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
            </HashRouter>
        );
    }
}
export default App;
