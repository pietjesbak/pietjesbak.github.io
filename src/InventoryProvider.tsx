import * as React from 'react';
import { Inventory } from './data/Inventory';

const inventory = new Inventory();
const { Provider, Consumer } = React.createContext(inventory);

export const InventoryProvider = Provider;
export const InventoryConsumer = Consumer;

export interface InjectedProps {
    inventory: Inventory;
}

// There are some issues with this implementation:
// I had to use `Partial<OriginalProps>` because TypeScript would complain `inventory` isn't provided when using the resulting component.
// Using `Partial` means that all my props are optional now...
// Ideally I want a type of `OriginalProps - inventory`
export function withInventory<OriginalProps extends {}>(Component: React.ComponentType<OriginalProps & InjectedProps>): (props: Partial<OriginalProps>) => JSX.Element {
    return (props: OriginalProps) => {
        return (
            <Consumer>
                {value => <Component {...props} inventory={value} />}
            </Consumer>
        );
    }
};
