import * as React from "react";
import { Inventory } from "./data/Inventory";

const inventory = new Inventory();
const { Provider, Consumer } = React.createContext(inventory);

export const InventoryProvider = Provider;
export const InventoryConsumer = Consumer;

export interface InjectedProps {
  inventory: Inventory;
}

// This HOC takes a component that requires at least the InjectedProps,
// and returns an SFC with those InjectedProps already filled in.
export function withInventory<OriginalProps>(
  Component:
    | React.ComponentType<OriginalProps & InjectedProps>
    | React.SFC<OriginalProps & InjectedProps>
): React.SFC<
  Pick<OriginalProps, Exclude<keyof OriginalProps, keyof InjectedProps>>
> {
  return (props: OriginalProps) => {
    return (
      <Consumer>
        {(value) => <Component {...props} inventory={value} />}
      </Consumer>
    );
  };
}
