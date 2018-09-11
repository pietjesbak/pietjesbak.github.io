import classNames from 'classnames';
import * as React from 'react';
import { Container } from './Container';

export interface State {
    collapsed: boolean;
}

export enum headerState {
    /**
     * The header is always shown. (default)
     */
    SHOWN,

    /**
     * The header is shown when hovering inside the container.
     */
    SHOWN_ON_HOVER,

    /**
     * The header is shown when hovering inside the container and always shown when collapsed.
     */
    SHOWN_COLLAPSED
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

    /**
     * How should the header behave?
     */
    header?: headerState;

    /**
     * Does the container contain an error? Affects the colors.
     * Note: this prop is just passed through to the child container.
     */
    error?: boolean;
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
        const {children, className, title, header, ...rest } = this.props;
        return (
            <Container className={classNames(className, 'collapsable')} {...rest}>
                <h3 className={classNames('collapsed-header', {'hover': header === headerState.SHOWN_ON_HOVER})} onClick={this.toggle}>
                    <i className="container-button icon-cog" />
                    {title}
                </h3>
            </Container>
        );
    }

    renderExpanded() {
        const {children, className, title, header, ...rest } = this.props;
        return (
            <Container className={classNames(className, 'collapsable')} {...rest}>
                <h3 className={classNames('collapsed-header', {'hover': header === headerState.SHOWN_ON_HOVER || headerState.SHOWN_COLLAPSED})} onClick={this.toggle}>
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
