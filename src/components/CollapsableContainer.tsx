import classNames from 'classnames';
import * as React from 'react';
import { Container } from './Container';

export interface State {
    collapsed: boolean;
}

export interface Props extends React.HTMLAttributes<CollapsableContainer> {
    /**
     * Is the container open or closed by default.
     * Default open.
     */
    defaultCollapsed?: boolean;

    /**
     * An optional title to show when the container is closed.
     */
    title?: string;
}

export class CollapsableContainer extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            collapsed: props.defaultCollapsed || false
        };
    }

    toggle = () => {
        this.setState({
            collapsed: !this.state.collapsed
        });
    }

    render(): JSX.Element {
        return this.state.collapsed ? this.renderCollapsed() : this.renderExpanded();
    }

    renderCollapsed() {
        const {children, className, title, ...rest } = this.props;
        return (
            <Container className={classNames(className, 'collapsable')} {...rest}>
                <h3 className="collapsed-header" onClick={this.toggle}>
                    <i className="container-button icon-cog" />
                    {title}
                </h3>
            </Container>
        ); 
    }

    renderExpanded() {
        const {children, className, title, ...rest } = this.props;
        return (
            <Container className={classNames(className, 'collapsable')} {...rest}>
                <h3 className="collapsed-header" onClick={this.toggle}>
                    <i className="container-button icon-info" />
                    {title}
                </h3>
                <div className="content">
                    {children}
                </div>
            </Container>
        ); 
    }
}
