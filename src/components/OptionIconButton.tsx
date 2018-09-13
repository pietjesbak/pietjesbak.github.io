import classNames from 'classnames';
import * as React from 'react';
import Tooltip from 'react-simple-tooltip';
import IconButton, { Props } from './IconButton';

class OptionIconButton extends IconButton {
    private ref: React.RefObject<HTMLDivElement>;

    constructor(props: Props) {
        super(props);

        this.ref = React.createRef();
    }

    onClick = () => {
        this.setState({
            active: !this.state.active
        });
    }

    loseFocus = (e: Event) => {
        if (this.state.active && !this.ref.current!.contains(e.target as Node)) {
            this.setState({
                active: false
            });
        }
    }

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('click', this.loseFocus);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('click', this.loseFocus);
    }

    renderBig() {
        return (
            <div className="button-wrapper" ref={this.ref} onClick={this.onClick}>
                <button className={classNames('button', this.props.subClass)} >
                    <i className={"icon-" + this.props.icon} /> {this.props.text}
                </button>

                {this.state.active ? (
                    <ul className={classNames('button-holder', this.props.placement === 'left' ? 'right' : 'left')}>
                        {this.props.children}
                    </ul>
                ) : null}
            </div>
        );
    }

    renderSmall() {
        return (
            <div className="button-wrapper" ref={this.ref} onClick={this.onClick}>
                <Tooltip content={this.props.text} placement={this.props.placement} padding={6}>
                    <button className={classNames('small-button', this.props.subClass)} >
                        <i className={"icon-" + this.props.icon} />
                    </button>
                </Tooltip>

                {this.state.active ? (
                    <div className={classNames('button-holder', 'small', this.props.placement === 'left' ? 'right' : 'left')}>
                        {this.props.children}
                    </div>
                ) : null}
            </div>
        );
    }
}

export default OptionIconButton;
