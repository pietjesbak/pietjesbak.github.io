import * as enzyme from 'enzyme';
import * as React from 'react';

import { Inventory } from '../data/Inventory';
import { EventCard } from './EventCard';

function getMockInventory(date: Date = new Date()) {
    const inventory = new Inventory();
    inventory.getMessage = () => {
        return Promise.resolve({
            title: 'Test event',
            body: 'The new test event starts now!',
            date
        });
    }

    return inventory;
}

describe('<EventCard />', () => {
    it('Renders a placeholder', () => {
        const inventory = getMockInventory();
        const card = enzyme.shallow(<EventCard inventory={inventory} />);

        expect(card).toMatchSnapshot();
    });

    it('Renders an event', async () => {
        const inventory = getMockInventory();
        const card = enzyme.shallow(<EventCard inventory={inventory} />);

        await Promise.resolve();
        expect(card).toMatchSnapshot();
    });

    it('Renders an ongoing event', async () => {
        const inventory = getMockInventory(new Date('September 19 2018 9:30'));
        const card = enzyme.shallow(<EventCard inventory={inventory} />);

        await Promise.resolve();
        expect(card.find('.date')).toMatchSnapshot();
    });

    it('Renders an passed event', async () => {
        const inventory = getMockInventory(new Date('September 18 2018 11:00'));
        const card = enzyme.shallow(<EventCard inventory={inventory} />);

        await Promise.resolve();
        expect(card.find('.date')).toMatchSnapshot();
    });

    it('Renders an event that has yet to come', async () => {
        const inventory = getMockInventory(new Date('September 20 2018 11:00'));
        const card = enzyme.shallow(<EventCard inventory={inventory} />);

        await Promise.resolve();
        expect(card.find('.date')).toMatchSnapshot();
    });
});
