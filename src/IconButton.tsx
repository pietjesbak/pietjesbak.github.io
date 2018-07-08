import * as React from 'react';
import Tooltip from 'react-simple-tooltip';
import { ICONBUTTON_MIN_SCREEN_WIDTH } from './data/Constants';

export interface State {
    windowWidth: number;
}

export interface Props extends React.HTMLAttributes<IconButton> {
    text: string | JSX.Element;
    placement?: string;
    subClass?: string;
    icon: string;
    to?: string;

    action?: (e: React.SyntheticEvent) => void;
}

export default class IconButton extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            windowWidth: window.innerWidth
        };
    }

    handleResize = () => {
        this.setState({
            windowWidth: window.innerWidth
        });
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleResize)
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize)
    }

    render() {
        if (this.state.windowWidth <= ICONBUTTON_MIN_SCREEN_WIDTH) {
            return (
                <Tooltip content={this.props.text} placement={this.props.placement}>
                    <button className={"small-button " + this.props.subClass} onClick={this.props.action}>
                        <i className={"icon-" + this.props.icon} />
                    </button>
                </Tooltip>
            );
        } else {
            return (
                <button className={"button " + this.props.subClass} onClick={this.props.action}>
                    <i className={"icon-" + this.props.icon} /> {this.props.text}
                </button>
            );
        }
    }
}
