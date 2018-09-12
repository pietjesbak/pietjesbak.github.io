import '../css/IconButton.css';

import classNames from 'classnames';
import * as React from 'react';
import Tooltip from 'react-simple-tooltip';
import { ICONBUTTON_MIN_SCREEN_WIDTH } from '../data/Constants';

export interface State {
    windowWidth: number;
    active: boolean;
}

export enum IconButtonBehavour {
    SMALL,
    BIG,
    AUTO
}

export interface Props extends React.HTMLAttributes<IconButton> {
    text: string | JSX.Element;
    placement?: string;
    subClass?: string;
    icon: string;
    to?: string;
    behaviour?: IconButtonBehavour

    action?: (e: React.SyntheticEvent) => void;
}

export default class IconButton extends React.Component<Props, State> {
    static defaultProps = {
        behaviour: IconButtonBehavour.AUTO
    }

    constructor(props: Props) {
        super(props);

        this.state = {
            windowWidth: window.innerWidth,
            active: false
        };
    }

    handleResize = () => {
        if (this.props.behaviour === IconButtonBehavour.AUTO) {
            this.setState({
                windowWidth: window.innerWidth
            });
        }
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    render() {
        if ((this.state.windowWidth <= ICONBUTTON_MIN_SCREEN_WIDTH || this.props.behaviour === IconButtonBehavour.SMALL) && this.props.behaviour !== IconButtonBehavour.BIG) {
            return this.renderSmall();
        } else {
            return this.renderBig();
        }
    }

    renderBig() {
        return (
            <button className={classNames('button', this.props.subClass)} onClick={this.props.action}>
                <i className={"icon-" + this.props.icon} /> {this.props.text}
            </button>
        );
    }

    renderSmall() {
        return (
            <Tooltip content={this.props.text} placement={this.props.placement}>
                <button className={classNames('small-button', this.props.subClass)} onClick={this.props.action}>
                    <i className={"icon-" + this.props.icon} />
                </button>
            </Tooltip>
        );
    }
}
